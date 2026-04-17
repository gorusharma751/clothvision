import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import {
  analyzeProduct,
  generateTryOn,
  generateProductBG,
  generateCustomerTryOn,
  generateProductContent,
  generate360View,
  measureProductSize,
  upscaleImage,
  generateAIPrompt,
  setAdminPrompts
} from '../services/geminiAgents.js';
import { uploadToCloudinary, uploadFileToCloudinary, isCloudinaryEnabled } from '../services/cloudinaryService.js';
import { createJob } from '../services/jobService.js';

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
  if (['GEMINI_KEY_INVALID', 'GEMINI_KEY_MISSING', 'GEMINI_KEY_REVOKED', 'GEMINI_MODEL_UNAVAILABLE', 'GEMINI_PERMISSION_DENIED', 'GEMINI_BAD_REQUEST', 'GEMINI_BAD_RESPONSE_FORMAT', 'GEMINI_VERTEX_CONFIG_MISSING'].includes(err.code)) return 502;
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

const loadAdminPrompts = async () => {
  try {
    const { rows } = await query("SELECT key, value FROM admin_settings WHERE category='ai_prompts'");
    const prompts = {};
    for (const row of rows) {
      prompts[row.key] = row.value;
    }
    setAdminPrompts(prompts);
  } catch (err) {
    console.error('Failed loading admin prompts:', err.message);
    setAdminPrompts({});
  }
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
      SELECT *
      FROM (
        SELECT
          gi.id::text AS id,
          COALESCE(gi.product_id::text, gi.id::text) AS product_id,
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
          p.original_image AS product_original_image,
          'image'::text AS media_type,
          NULL::text AS video_url,
          NULL::text AS thumbnail_url,
          (p.id IS NOT NULL) AS listing_supported
        FROM generated_images gi
        LEFT JOIN products p ON p.id = gi.product_id
        WHERE gi.owner_id = $1

        UNION ALL

        SELECT
          vg.id::text AS id,
          COALESCE(vg.product_id::text, CONCAT('video-', vg.id::text)) AS product_id,
          'video'::text AS image_type,
          NULL::text AS angle,
          vg.video_type AS platform,
          first_frame.frame_url AS image_url,
          NULL::text AS upscaled_url,
          COALESCE(first_frame.frame_url, vg.script->>'video_url') AS final_image_url,
          vg.id::text AS task_id,
          'video'::text AS task_kind,
          vg.created_at,
          COALESCE(vg.script->>'product_name', vg.script->>'brand_name', 'Video Generation') AS product_name,
          COALESCE(vg.script->>'product_category', 'video') AS product_category,
          NULL::text AS product_original_image,
          'video'::text AS media_type,
          vg.script->>'video_url' AS video_url,
          first_frame.frame_url AS thumbnail_url,
          (vg.product_id IS NOT NULL) AS listing_supported
        FROM video_generations vg
        LEFT JOIN LATERAL (
          SELECT COALESCE(
            NULLIF(frame->>'generated_url', ''),
            NULLIF(frame->>'url', ''),
            NULLIF(frame->>'image_url', ''),
            NULLIF(frame->>'final_image_url', '')
          ) AS frame_url
          FROM jsonb_array_elements(COALESCE(vg.frames, '[]'::jsonb)) frame
          WHERE COALESCE(
            NULLIF(frame->>'generated_url', ''),
            NULLIF(frame->>'url', ''),
            NULLIF(frame->>'image_url', ''),
            NULLIF(frame->>'final_image_url', '')
          ) IS NOT NULL
          LIMIT 1
        ) first_frame ON TRUE
        WHERE vg.owner_id = $1
          AND COALESCE(vg.script->>'video_url', '') <> ''

        UNION ALL

        SELECT
          CONCAT(vg.id::text, '-frame-', vf.frame_index::text) AS id,
          COALESCE(vg.product_id::text, CONCAT('video-', vg.id::text)) AS product_id,
          'keyframe'::text AS image_type,
          CONCAT('frame ', vf.frame_index::text) AS angle,
          vg.video_type AS platform,
          vf.frame_url AS image_url,
          NULL::text AS upscaled_url,
          vf.frame_url AS final_image_url,
          vg.id::text AS task_id,
          'video'::text AS task_kind,
          vg.created_at,
          COALESCE(vg.script->>'product_name', vg.script->>'brand_name', 'Video Generation') AS product_name,
          COALESCE(vg.script->>'product_category', 'video') AS product_category,
          NULL::text AS product_original_image,
          'image'::text AS media_type,
          NULL::text AS video_url,
          vf.frame_url AS thumbnail_url,
          (vg.product_id IS NOT NULL) AS listing_supported
        FROM video_generations vg
        JOIN LATERAL (
          SELECT
            frame_item.ordinality::int AS frame_index,
            COALESCE(
              NULLIF(frame_item.frame->>'generated_url', ''),
              NULLIF(frame_item.frame->>'url', ''),
              NULLIF(frame_item.frame->>'image_url', ''),
              NULLIF(frame_item.frame->>'final_image_url', '')
            ) AS frame_url
          FROM jsonb_array_elements(COALESCE(vg.frames, '[]'::jsonb)) WITH ORDINALITY AS frame_item(frame, ordinality)
        ) vf ON vf.frame_url IS NOT NULL
        WHERE vg.owner_id = $1
          AND COALESCE(vg.script->>'video_url', '') <> ''
      ) gallery
      ORDER BY created_at DESC
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
  try {
    if (!req.file) return res.status(400).json({ error: 'Model image required' });

    const { rows: products } = await query('SELECT id FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });

    const angleList = (() => {
      const rawAngles = req.body.angles;
      if (Array.isArray(rawAngles) && rawAngles.length) return rawAngles;
      if (!rawAngles) return ['front', 'back', 'left_side', 'right_side'];
      try {
        const parsed = JSON.parse(rawAngles);
        return Array.isArray(parsed) && parsed.length ? parsed : ['front', 'back', 'left_side', 'right_side'];
      } catch {
        return ['front', 'back', 'left_side', 'right_side'];
      }
    })();

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', req.params.id]);

    const storedModelImage = await saveUploadedFile(req.file.path, req.user.id);

    const job = await createJob({
      userId: req.user.id,
      type: 'image',
      input: {
        operation: 'products_generate',
        productId: req.params.id,
        modelImagePath: storedModelImage,
        angles: angleList,
        platform: req.body.platform || 'general',
        customPromptExtra: req.body.custom_prompt_extra || ''
      }
    });

    console.log(`[jobs] created job=${job.id} type=image op=products_generate user=${req.user.id}`);
    return res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

// Generate 360 set for an existing product (front/left/back/right)
router.post('/:id/generate-360', upload.single('model_image'), async (req, res) => {
  try {
    const { rows: products } = await query('SELECT id FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', req.params.id]);

    const storedModelImage = req.file?.path ? await saveUploadedFile(req.file.path, req.user.id) : null;

    const job = await createJob({
      userId: req.user.id,
      type: 'image',
      input: {
        operation: 'products_generate_360',
        productId: req.params.id,
        modelImagePath: storedModelImage,
        customPromptExtra: req.body.custom_prompt_extra || ''
      }
    });

    console.log(`[jobs] created job=${job.id} type=image op=products_generate_360 user=${req.user.id}`);
    return res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

// Generate 360 set directly from uploaded product image (without pre-created product)
router.post('/generate-360-direct', upload.fields([{ name: 'product_image' }, { name: 'model_image' }]), async (req, res) => {
  try {
    if (!req.files?.product_image) return res.status(400).json({ error: 'Product image required' });

    const productImagePath = await saveUploadedFile(req.files.product_image[0].path, req.user.id);
    const modelImagePath = req.files?.model_image?.[0]?.path
      ? await saveUploadedFile(req.files.model_image[0].path, req.user.id)
      : null;
    const job = await createJob({
      userId: req.user.id,
      type: 'image',
      input: {
        operation: 'products_generate_360_direct',
        productImagePath,
        modelImagePath,
        productName: req.body.product_name || 'Product',
        productCategory: req.body.product_category || 'clothing',
        productColor: req.body.product_color || '',
        customPromptExtra: req.body.custom_prompt_extra || ''
      }
    });

    console.log(`[jobs] created job=${job.id} type=image op=products_generate_360_direct user=${req.user.id}`);
    return res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

// Product measurement helper for size guidance
router.post('/:id/measure', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });

    const measurement = await measureProductSize(rows[0].original_image, rows[0]);
    res.json(measurement);
  } catch (err) {
    res.status(getErrorStatusCode(err)).json({ error: err.message });
  }
});

// Generate without model (product BG)
router.post('/:id/generate-bg', async (req, res) => {
  try {
    const { rows: products } = await query('SELECT id FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', req.params.id]);

    const job = await createJob({
      userId: req.user.id,
      type: 'image',
      input: {
        operation: 'products_generate_bg',
        productId: req.params.id,
        bgStyle: req.body.bg_style || 'studio',
        customPromptExtra: req.body.custom_prompt_extra || '',
        customBGDescription: req.body.custom_bg_description || ''
      }
    });

    console.log(`[jobs] created job=${job.id} type=image op=products_generate_bg user=${req.user.id}`);
    return res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create job' });
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

router.post('/:id/generate-prompt', async (req, res) => {
  const { prompt_type } = req.body;
  try {
    const { rows } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    await loadAdminPrompts();
    const suggestion = await generateAIPrompt(rows[0].original_image, rows[0], prompt_type || 'tryon');
    res.json(suggestion);
  } catch (err) {
    res.status(getErrorStatusCode(err)).json({ error: err.message });
  }
});

router.post('/generate-prompt-direct', upload.single('product_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Product image required' });

    await loadAdminPrompts();

    const details = {
      name: req.body.name || req.body.product_name || 'Product',
      category: req.body.category || req.body.product_category || 'clothing',
      color: req.body.color || req.body.product_color || '',
      description: req.body.description || ''
    };

    const suggestion = await generateAIPrompt(req.file.path, details, req.body.prompt_type || 'tryon');
    res.json(suggestion);
  } catch (err) {
    res.status(getErrorStatusCode(err)).json({ error: err.message });
  }
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

    const customerPhotoPath = await saveUploadedFile(req.files.customer_photo[0].path, req.user.id);
    const productPhotoPath = await saveUploadedFile(req.files.product_photo[0].path, req.user.id);

    const job = await createJob({
      userId: req.user.id,
      type: 'image',
      input: {
        operation: 'products_customer_tryon',
        customerPhotoPath,
        productPhotoPath,
        productName: req.body.product_name || 'Product',
        productCategory: req.body.product_category || 'clothing',
        productColor: req.body.product_color || '',
        customPromptExtra: req.body.custom_prompt_extra || ''
      }
    });

    console.log(`[jobs] created job=${job.id} type=image op=products_customer_tryon user=${req.user.id}`);
    return res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create job' });
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
