import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { analyzeProduct, generateTryOn, generateProductBG, generateCustomerTryOn, generateProductContent, upscaleImage } from '../services/geminiAgents.js';
import { uploadToCloudinary, uploadFileToCloudinary, isCloudinaryEnabled } from '../services/cloudinaryService.js';

const router = express.Router();
router.use(authenticate);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirConfig = String(process.env.UPLOAD_DIR || './uploads').trim();
const UPLOAD_ROOT = path.isAbsolute(uploadDirConfig)
  ? uploadDirConfig
  : path.resolve(__dirname, '..', uploadDirConfig);

const getUserUploadDir = (userId) => path.join(UPLOAD_ROOT, String(userId));
const ensureUserUploadDir = (userId) => {
  const dir = getUserUploadDir(userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const makeUploadPath = (userId, fileName) => path.join(ensureUserUploadDir(userId), fileName).replace(/\\/g, '/');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = ensureUserUploadDir(req.user.id);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// Helper: check & deduct credits
const useCredits = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || rows[0].balance < amount) throw new Error('Insufficient credits');
  await query('UPDATE credits SET balance = balance - $1, total_used = total_used + $1, updated_at=NOW() WHERE owner_id=$2', [amount, userId]);
  return true;
};

const ensureCreditsAvailable = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || rows[0].balance < amount) throw new Error('Insufficient credits');
  return true;
};

const getErrorStatusCode = (err) => {
  if (err.message === 'Insufficient credits') return 402;
  if (err.code === 'GEMINI_QUOTA_EXCEEDED') return 503;
  if (['GEMINI_KEY_INVALID', 'GEMINI_KEY_MISSING', 'GEMINI_KEY_REVOKED', 'GEMINI_MODEL_UNAVAILABLE', 'GEMINI_PERMISSION_DENIED', 'GEMINI_BAD_REQUEST', 'GEMINI_VERTEX_CONFIG_MISSING'].includes(err.code)) return 502;
  return 500;
};

const normalizeTextArray = (value, separator = ',') => {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  return String(value || '')
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
};

// Get credit costs for user's plan
const getCreditCosts = async (userId) => {
  const { rows } = await query('SELECT ps.credits_per_image, ps.tryon_credits, ps.upscale_credits FROM shops s JOIN plan_settings ps ON ps.plan_name = s.plan WHERE s.owner_id=$1', [userId]);
  return rows[0] || { credits_per_image: 8, tryon_credits: 3, upscale_credits: 2 };
};

// Save generated image buffer: Cloudinary when configured, local disk otherwise.
const saveImage = async (buffer, userId, fileName) => {
  if (isCloudinaryEnabled()) {
    return await uploadToCloudinary(buffer, { folder: `clothvision/${userId}` });
  }

  const outPath = makeUploadPath(userId, fileName);
  fs.writeFileSync(outPath, buffer);
  return outPath;
};

// Save uploaded file path: push to Cloudinary when configured, keep local path otherwise.
const saveUploadedFile = async (filePath, userId) => {
  if (isCloudinaryEnabled()) {
    try {
      const cloudUrl = await uploadFileToCloudinary(filePath, { folder: `clothvision/${userId}/uploads` });
      if (cloudUrl) return cloudUrl;
    } catch (err) {
      console.error('Cloudinary upload failed, falling back to local file:', err.message);
    }
  }

  return filePath;
};

// List products
router.get('/', async (req, res) => {
  try {
    // Auto-heal stale products stuck in processing with no outputs for a while.
    await query(`
      UPDATE products p
      SET status = 'failed', updated_at = NOW()
      WHERE p.owner_id = $1
        AND p.status = 'processing'
        AND p.updated_at < (NOW() - INTERVAL '10 minutes')
        AND NOT EXISTS (
          SELECT 1
          FROM generated_images gi
          WHERE gi.product_id = p.id
        )
    `, [req.user.id]);

    const { rows } = await query(`
      SELECT
        p.*,
        (
          SELECT COUNT(*)::INT
          FROM generated_images gi
          WHERE gi.product_id = p.id
        ) AS image_count,
        (
          SELECT COALESCE(gi.upscaled_url, gi.image_url)
          FROM generated_images gi
          WHERE gi.product_id = p.id
          ORDER BY gi.created_at DESC
          LIMIT 1
        ) AS latest_image_url
      FROM products p
      WHERE p.owner_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List all generated outputs for owner gallery
router.get('/generated', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        gi.id,
        gi.product_id,
        gi.image_type,
        gi.angle,
        gi.platform,
        gi.image_url,
        gi.upscaled_url,
        COALESCE(gi.upscaled_url, gi.image_url) AS final_image_url,
        COALESCE(gi.metadata->>'task_id', gi.id::text) AS task_id,
        COALESCE(gi.metadata->>'task_kind', gi.image_type) AS task_kind,
        gi.created_at,
        p.name AS product_name,
        p.category AS product_category,
        p.original_image AS product_original_image
      FROM generated_images gi
      JOIN products p ON p.id = gi.product_id
      WHERE gi.owner_id = $1
      ORDER BY gi.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', upload.single('product_image'), async (req, res) => {
  const { name, category, description, color, size_range, material, price, brand } = req.body;
  if (!name || !req.file) return res.status(400).json({ error: 'Name and product image required' });
  
  try {
    const imagePath = await saveUploadedFile(req.file.path, req.user.id);
    const { rows } = await query(
      'INSERT INTO products (owner_id, name, category, description, color, size_range, material, price, brand, original_image, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [req.user.id, name, category, description, color, size_range, material, price, brand, imagePath, 'ready']
    );
    res.json(rows[0]);
  } catch (err) {
    if (err?.code === '23503' && err?.constraint === 'products_owner_id_fkey') {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Generate images with model
router.post('/:id/generate', upload.single('model_image'), async (req, res) => {
  const { angles, platform } = req.body;
  const angleList = angles ? JSON.parse(angles) : ['front', 'back', 'left_side', 'right_side'];
  let productId = null;
  let movedToProcessing = false;
  const taskId = uuidv4();
  
  try {
    const { rows: products } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });
    const product = products[0];
    productId = product.id;
    
    if (!req.file) return res.status(400).json({ error: 'Model image required' });
    
    const costs = await getCreditCosts(req.user.id);
    const totalCredits = angleList.length * costs.credits_per_image;
    await ensureCreditsAvailable(req.user.id, totalCredits);

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', product.id]);
    movedToProcessing = true;
    
    const results = [];
    const generationErrors = [];
    for (const angle of angleList) {
      try {
        const result = await generateTryOn(req.file.path, product.original_image, product, angle);
        if (result.success) {
          const imageBuffer = Buffer.from(result.imageData, 'base64');
          const savedUrl = await saveImage(imageBuffer, req.user.id, `gen_${uuidv4()}.jpg`);

          const { rows } = await query(
            'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, platform, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
            [
              product.id,
              req.user.id,
              'tryon',
              angle,
              savedUrl,
              platform || 'general',
              costs.credits_per_image,
              JSON.stringify({ task_id: taskId, task_kind: 'tryon', angle })
            ]
          );
          results.push(rows[0]);
        } else {
          generationErrors.push(`${angle}: ${result.error || 'No image generated'}`);
        }
      } catch (err) {
        if (!results.length && err.code) throw err;
        generationErrors.push(`${angle}: ${err.message}`);
      }
    }

    if (!results.length) throw new Error(generationErrors[0] || 'Image generation failed');

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', product.id]);

    const actualCredits = results.length * costs.credits_per_image;
    await useCredits(req.user.id, actualCredits);
    
    await query(
      'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
      [
        req.user.id,
        'use',
        actualCredits,
        `Generated ${results.length} try-on images for "${product.name}" (${costs.credits_per_image}/image = ${actualCredits})`
      ]
    );
    
    res.json({
      success: true,
      images: results,
      task_id: taskId,
      credits_used: actualCredits,
      credits_per_image: costs.credits_per_image,
      generated_count: results.length,
      generation_errors: generationErrors
    });
  } catch (err) {
    if (productId && movedToProcessing) {
      try { await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', productId]); } catch {}
    }
    res.status(getErrorStatusCode(err)).json({ error: err.message });
  }
});

// Generate without model (product BG)
router.post('/:id/generate-bg', async (req, res) => {
  const { bg_style } = req.body;
  let productId = null;
  let movedToProcessing = false;
  const taskId = uuidv4();
  try {
    const { rows: products } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });
    const product = products[0];
    productId = product.id;
    
    const costs = await getCreditCosts(req.user.id);
    await ensureCreditsAvailable(req.user.id, costs.credits_per_image);

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', product.id]);
    movedToProcessing = true;
    
    const result = await generateProductBG(product.original_image, product, bg_style || 'studio');
    if (!result.success) throw new Error('Image generation failed');

    await useCredits(req.user.id, costs.credits_per_image);
    
    const imageBuffer = Buffer.from(result.imageData, 'base64');
    const savedUrl = await saveImage(imageBuffer, req.user.id, `bg_${uuidv4()}.jpg`);
    
    const { rows } = await query(
      'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [
        product.id,
        req.user.id,
        'bg_only',
        bg_style,
        savedUrl,
        costs.credits_per_image,
        JSON.stringify({ task_id: taskId, task_kind: 'bg_only', bg_style: bg_style || 'studio' })
      ]
    );

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', product.id]);
    
    await query(
      'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
      [
        req.user.id,
        'use',
        costs.credits_per_image,
        `BG generation for "${product.name}" (${costs.credits_per_image}/image)`
      ]
    );
    
    res.json({ success: true, image: rows[0], task_id: taskId, credits_used: costs.credits_per_image, credits_per_image: costs.credits_per_image });
  } catch (err) {
    if (productId && movedToProcessing) {
      try { await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', productId]); } catch {}
    }
    res.status(getErrorStatusCode(err)).json({ error: err.message });
  }
});

// Read existing listing content for a product/platform
router.get('/:id/listing-content', async (req, res) => {
  const platform = String(req.query.platform || 'amazon').toLowerCase();
  try {
    const { rows: products } = await query('SELECT id FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });

    const { rows } = await query(
      'SELECT * FROM amazon_flipkart_content WHERE product_id=$1 AND platform=$2 ORDER BY generated_at DESC LIMIT 1',
      [req.params.id, platform]
    );

    if (!rows.length) return res.json({ exists: false });
    return res.json({ exists: true, content: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze product
router.post('/:id/analyze', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    const analysis = await analyzeProduct(rows[0].original_image, rows[0]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upscale image
router.post('/images/:imageId/upscale', async (req, res) => {
  try {
    const { rows } = await query('SELECT gi.*, p.owner_id FROM generated_images gi JOIN products p ON p.id=gi.product_id WHERE gi.id=$1', [req.params.imageId]);
    if (!rows.length) return res.status(404).json({ error: 'Image not found' });
    const img = rows[0];
    if (img.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const costs = await getCreditCosts(req.user.id);
    await ensureCreditsAvailable(req.user.id, costs.upscale_credits);
    
    const imageBuffer = img.image_url.startsWith('http')
      ? Buffer.from(await (await fetch(img.image_url)).arrayBuffer())
      : fs.readFileSync(img.image_url);
    const upscaled = await upscaleImage(imageBuffer, 2400);
    const savedUrl = await saveImage(upscaled, req.user.id, `upscaled_${uuidv4()}.jpg`);

    await useCredits(req.user.id, costs.upscale_credits);
    
    await query('UPDATE generated_images SET upscaled_url=$1, is_upscaled=true WHERE id=$2', [savedUrl, img.id]);
    await query('INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)', [req.user.id, 'use', costs.upscale_credits, 'Image upscale']);
    
    res.json({ success: true, upscaled_url: savedUrl });
  } catch (err) {
    res.status(getErrorStatusCode(err)).json({ error: err.message });
  }
});

// Generate listing content
router.post('/:id/listing-content', async (req, res) => {
  const { platform } = req.body;
  try {
    const { rows } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    
    const content = await generateProductContent(rows[0], platform || 'amazon');
    const normalizedBulletPoints = normalizeTextArray(content?.bullet_points, '\n');
    const normalizedKeywords = normalizeTextArray(content?.keywords, ',');
    
    const platformValue = String(platform || 'amazon').toLowerCase();
    const { rows: existingRows } = await query(
      'SELECT id FROM amazon_flipkart_content WHERE product_id=$1 AND platform=$2 ORDER BY generated_at DESC LIMIT 1',
      [rows[0].id, platformValue]
    );

    if (existingRows.length) {
      await query(
        'UPDATE amazon_flipkart_content SET title=$1, description=$2, bullet_points=$3, keywords=$4, category_path=$5, generated_at=NOW() WHERE id=$6',
        [content.title, content.description, JSON.stringify(normalizedBulletPoints), normalizedKeywords, content.category_path, existingRows[0].id]
      );
    } else {
      await query(
        'INSERT INTO amazon_flipkart_content (product_id, platform, title, description, bullet_points, keywords, category_path) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [rows[0].id, platformValue, content.title, content.description, JSON.stringify(normalizedBulletPoints), normalizedKeywords, content.category_path]
      );
    }
    
    res.json(content);
  } catch (err) { res.status(getErrorStatusCode(err)).json({ error: err.message }); }
});

// Update listing content manually
router.put('/:id/listing-content', async (req, res) => {
  const { platform, title, description, bullet_points, keywords, category_path } = req.body;
  const platformValue = String(platform || 'amazon').toLowerCase();
  try {
    const { rows: products } = await query('SELECT id FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });

    const normalizedBulletPoints = Array.isArray(bullet_points)
      ? bullet_points
      : String(bullet_points || '')
          .split('\n')
          .map((v) => v.trim())
          .filter(Boolean);

    const normalizedKeywords = Array.isArray(keywords)
      ? keywords
      : String(keywords || '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);

    const { rows: existingRows } = await query(
      'SELECT id FROM amazon_flipkart_content WHERE product_id=$1 AND platform=$2 ORDER BY generated_at DESC LIMIT 1',
      [req.params.id, platformValue]
    );

    if (existingRows.length) {
      await query(
        'UPDATE amazon_flipkart_content SET title=$1, description=$2, bullet_points=$3, keywords=$4, category_path=$5, generated_at=NOW() WHERE id=$6',
        [title || '', description || '', JSON.stringify(normalizedBulletPoints), normalizedKeywords, category_path || '', existingRows[0].id]
      );
    } else {
      await query(
        'INSERT INTO amazon_flipkart_content (product_id, platform, title, description, bullet_points, keywords, category_path) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [req.params.id, platformValue, title || '', description || '', JSON.stringify(normalizedBulletPoints), normalizedKeywords, category_path || '']
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get product images
router.get('/:id/images', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM generated_images WHERE product_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Customer try-on
router.post('/customer-tryon', upload.fields([{ name: 'customer_photo' }, { name: 'product_photo' }]), async (req, res) => {
  try {
    if (!req.files?.customer_photo || !req.files?.product_photo) return res.status(400).json({ error: 'Both photos required' });
    
    const costs = await getCreditCosts(req.user.id);
    await ensureCreditsAvailable(req.user.id, costs.tryon_credits);
    
    const { product_name, product_category, product_color } = req.body;
    const productDetails = { name: product_name || 'Product', category: product_category || 'clothing', color: product_color };
    
    const results = await generateCustomerTryOn(
      req.files.customer_photo[0].path,
      req.files.product_photo[0].path,
      productDetails
    );

    if (!results.length) throw new Error('No try-on images generated. Check Gemini quota/billing and retry.');
    
    const savedImages = [];
    for (const r of results) {
      const buf = Buffer.from(r.imageData, 'base64');
      const savedUrl = await saveImage(buf, req.user.id, `ctryon_${uuidv4()}.jpg`);
      savedImages.push({ angle: r.angle, url: savedUrl });
    }

    await useCredits(req.user.id, costs.tryon_credits);
    
    const { rows } = await query(
      'INSERT INTO customer_tryon (owner_id, customer_photo, product_photo, result_images, credits_used) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, req.files.customer_photo[0].path, req.files.product_photo[0].path, JSON.stringify(savedImages), costs.tryon_credits]
    );
    
    await query('INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)', [req.user.id, 'use', costs.tryon_credits, 'Customer try-on']);
    
    res.json({ success: true, images: savedImages, record: rows[0] });
  } catch (err) {
    res.status(getErrorStatusCode(err)).json({ error: err.message });
  }
});

export default router;

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
