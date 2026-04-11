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
const UPLOAD_ROOT = path.isAbsolute(uploadDirConfig) ? uploadDirConfig : path.resolve(__dirname, '..', uploadDirConfig);

const ensureUserUploadDir = (userId) => {
  const dir = path.join(UPLOAD_ROOT, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const makeUploadPath = (userId, fileName) => path.join(ensureUserUploadDir(userId), fileName).replace(/\\/g, '/');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureUserUploadDir(req.user.id)),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const useCredits = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || rows[0].balance < amount) throw new Error('Insufficient credits');
  await query('UPDATE credits SET balance=balance-$1, total_used=total_used+$1, updated_at=NOW() WHERE owner_id=$2', [amount, userId]);
};

const ensureCreditsAvailable = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || rows[0].balance < amount) throw new Error('Insufficient credits');
};

const getErrorStatusCode = (err) => {
  if (err.message === 'Insufficient credits') return 402;
  if (err.code === 'GEMINI_QUOTA_EXCEEDED') return 503;
  if (['GEMINI_KEY_INVALID','GEMINI_KEY_MISSING','GEMINI_MODEL_UNAVAILABLE','GEMINI_PERMISSION_DENIED','GEMINI_BAD_REQUEST'].includes(err.code)) return 502;
  return 500;
};

const getCreditCosts = async (userId) => {
  const { rows } = await query('SELECT ps.credits_per_image, ps.tryon_credits, ps.upscale_credits FROM shops s JOIN plan_settings ps ON ps.plan_name=s.plan WHERE s.owner_id=$1', [userId]);
  return rows[0] || { credits_per_image: 1, tryon_credits: 3, upscale_credits: 2 };
};

// Save generated image buffer — Cloudinary in prod, local in dev
const saveImage = async (buffer, userId, filename) => {
  if (isCloudinaryEnabled()) {
    return await uploadToCloudinary(buffer, { folder: `clothvision/${userId}` });
  }
  const outPath = makeUploadPath(userId, filename);
  fs.writeFileSync(outPath, buffer);
  return outPath;
};

// Save uploaded file — Cloudinary in prod, keep local in dev
const saveUploadedFile = async (filePath, userId) => {
  if (isCloudinaryEnabled()) {
    try {
      const cloudUrl = await uploadFileToCloudinary(filePath, { folder: `clothvision/${userId}/uploads` });
      if (cloudUrl) return cloudUrl;
    } catch (e) { console.error('Cloudinary upload failed, using local:', e.message); }
  }
  return filePath;
};

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT p.*, COUNT(gi.id) as image_count FROM products p LEFT JOIN generated_images gi ON gi.product_id=p.id WHERE p.owner_id=$1 GROUP BY p.id ORDER BY p.created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', upload.single('product_image'), async (req, res) => {
  const { name, category, description, color, size_range, material, price, brand } = req.body;
  if (!name || !req.file) return res.status(400).json({ error: 'Name and product image required' });
  try {
    const imagePath = await saveUploadedFile(req.file.path, req.user.id);
    const { rows } = await query(
      'INSERT INTO products (owner_id,name,category,description,color,size_range,material,price,brand,original_image,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [req.user.id, name, category, description, color, size_range, material, price, brand, imagePath, 'ready']
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/generate', upload.single('model_image'), async (req, res) => {
  const { angles, platform } = req.body;
  const angleList = angles ? JSON.parse(angles) : ['front','back','left_side','right_side'];
  try {
    const { rows: products } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });
    const product = products[0];
    if (!req.file) return res.status(400).json({ error: 'Model image required' });
    const costs = await getCreditCosts(req.user.id);
    await ensureCreditsAvailable(req.user.id, angleList.length * costs.credits_per_image);
    const results = [], generationErrors = [];
    for (const angle of angleList) {
      try {
        const result = await generateTryOn(req.file.path, product.original_image, product, angle);
        if (result.success) {
          const buf = Buffer.from(result.imageData, 'base64');
          const savedUrl = await saveImage(buf, req.user.id, `gen_${uuidv4()}.jpg`);
          const { rows } = await query('INSERT INTO generated_images (product_id,owner_id,image_type,angle,image_url,platform,credits_used) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [product.id, req.user.id, 'tryon', angle, savedUrl, platform||'general', costs.credits_per_image]);
          results.push(rows[0]);
        } else { generationErrors.push(`${angle}: ${result.error}`); }
      } catch (err) {
        if (!results.length && err.code) throw err;
        generationErrors.push(`${angle}: ${err.message}`);
      }
    }
    if (!results.length) throw new Error(generationErrors[0] || 'Generation failed');
    const used = results.length * costs.credits_per_image;
    await useCredits(req.user.id, used);
    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)', [req.user.id,'use',used,`Generated ${results.length} images for "${product.name}"`]);
    res.json({ success: true, images: results, credits_used: used, generation_errors: generationErrors });
  } catch (err) { res.status(getErrorStatusCode(err)).json({ error: err.message }); }
});

router.post('/:id/generate-bg', async (req, res) => {
  const { bg_style } = req.body;
  try {
    const { rows: products } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });
    const product = products[0];
    const costs = await getCreditCosts(req.user.id);
    await ensureCreditsAvailable(req.user.id, costs.credits_per_image);
    const result = await generateProductBG(product.original_image, product, bg_style || 'studio');
    if (!result.success) throw new Error('Image generation failed');
    await useCredits(req.user.id, costs.credits_per_image);
    const buf = Buffer.from(result.imageData, 'base64');
    const savedUrl = await saveImage(buf, req.user.id, `bg_${uuidv4()}.jpg`);
    const { rows } = await query('INSERT INTO generated_images (product_id,owner_id,image_type,angle,image_url,credits_used) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [product.id, req.user.id, 'bg_only', bg_style, savedUrl, costs.credits_per_image]);
    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)', [req.user.id,'use',costs.credits_per_image,`BG gen for "${product.name}"`]);
    res.json({ success: true, image: rows[0] });
  } catch (err) { res.status(getErrorStatusCode(err)).json({ error: err.message }); }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(await analyzeProduct(rows[0].original_image, rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)', [req.user.id,'use',costs.upscale_credits,'Image upscale']);
    res.json({ success: true, upscaled_url: savedUrl });
  } catch (err) { res.status(getErrorStatusCode(err)).json({ error: err.message }); }
});

router.post('/:id/listing-content', async (req, res) => {
  const { platform } = req.body;
  try {
    const { rows } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    const content = await generateProductContent(rows[0], platform || 'amazon');
    await query('INSERT INTO amazon_flipkart_content (product_id,platform,title,description,bullet_points,keywords,category_path) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
      [rows[0].id, platform, content.title, content.description, JSON.stringify(content.bullet_points), content.keywords, content.category_path]);
    res.json(content);
  } catch (err) { res.status(getErrorStatusCode(err)).json({ error: err.message }); }
});

router.get('/:id/images', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM generated_images WHERE product_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/customer-tryon', upload.fields([{ name: 'customer_photo' }, { name: 'product_photo' }]), async (req, res) => {
  try {
    if (!req.files?.customer_photo || !req.files?.product_photo) return res.status(400).json({ error: 'Both photos required' });
    const costs = await getCreditCosts(req.user.id);
    await ensureCreditsAvailable(req.user.id, costs.tryon_credits);
    const { product_name, product_category, product_color } = req.body;
    const results = await generateCustomerTryOn(req.files.customer_photo[0].path, req.files.product_photo[0].path, { name: product_name||'Product', category: product_category||'clothing', color: product_color });
    if (!results.length) throw new Error('No try-on images generated. Check Gemini quota.');
    const savedImages = [];
    for (const r of results) {
      const buf = Buffer.from(r.imageData, 'base64');
      const savedUrl = await saveImage(buf, req.user.id, `ctryon_${uuidv4()}.jpg`);
      savedImages.push({ angle: r.angle, url: savedUrl });
    }
    await useCredits(req.user.id, costs.tryon_credits);
    const { rows } = await query('INSERT INTO customer_tryon (owner_id,customer_photo,product_photo,result_images,credits_used) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, req.files.customer_photo[0].path, req.files.product_photo[0].path, JSON.stringify(savedImages), costs.tryon_credits]);
    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)', [req.user.id,'use',costs.tryon_credits,'Customer try-on']);
    res.json({ success: true, images: savedImages, record: rows[0] });
  } catch (err) { res.status(getErrorStatusCode(err)).json({ error: err.message }); }
});

export default router;
