import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { generateProductScene, generateScenePrompt } from '../services/sceneBuilderAgent.js';
import { uploadToCloudinary, isCloudinaryEnabled } from '../services/cloudinaryService.js';

const router = express.Router();
router.use(authenticate);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirConfig = String(process.env.UPLOAD_DIR || './uploads').trim();
const UPLOAD_ROOT = path.isAbsolute(uploadDirConfig)
  ? uploadDirConfig
  : path.resolve(__dirname, '..', uploadDirConfig);

const ensureDir = (userId) => {
  const dir = path.join(UPLOAD_ROOT, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureDir(req.user.id)),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const saveImage = async (buffer, userId, filename) => {
  if (isCloudinaryEnabled()) {
    return await uploadToCloudinary(buffer, { folder: `clothvision/${userId}/scenes` });
  }
  const outPath = path.join(ensureDir(userId), filename).replace(/\\/g, '/');
  fs.writeFileSync(outPath, buffer);
  return outPath;
};

const useCredits = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || rows[0].balance < amount) throw new Error('Insufficient credits');
  await query('UPDATE credits SET balance=balance-$1, total_used=total_used+$1, updated_at=NOW() WHERE owner_id=$2', [amount, userId]);
};

// Get scene presets
router.get('/presets', (req, res) => {
  res.json({
    surface_types: [
      { id: 'table', label: 'Table / Desk', emoji: '🪑', desc: 'Place product on table surface' },
      { id: 'shelf', label: 'Shelf / Rack', emoji: '📚', desc: 'Place on shelf or rack' },
      { id: 'floor', label: 'Floor / Ground', emoji: '🪵', desc: 'Place on floor surface' },
      { id: 'car_dashboard', label: 'Car Dashboard', emoji: '🚗', desc: 'Place inside car' },
      { id: 'car_seat', label: 'Car Seat', emoji: '💺', desc: 'Place on car seat' },
      { id: 'bed', label: 'Bed / Sofa', emoji: '🛋️', desc: 'Place on furniture' },
      { id: 'custom', label: 'Custom Position', emoji: '✏️', desc: 'Describe your own placement' },
    ],
    prop_items: [
      { id: 'flowers', label: 'Flowers', emoji: '💐' },
      { id: 'candles', label: 'Candles', emoji: '🕯️' },
      { id: 'books', label: 'Books', emoji: '📚' },
      { id: 'leaves', label: 'Leaves/Plants', emoji: '🌿' },
      { id: 'fabric', label: 'Fabric/Cloth', emoji: '🧣' },
      { id: 'stones', label: 'Pebbles/Stones', emoji: '🪨' },
      { id: 'coffee_cup', label: 'Coffee Cup', emoji: '☕' },
      { id: 'watch', label: 'Watch', emoji: '⌚' },
      { id: 'sunglasses', label: 'Sunglasses', emoji: '🕶️' },
      { id: 'jewelry', label: 'Jewelry', emoji: '💍' },
    ],
    output_formats: [
      { id: 'flipkart_square', label: 'Flipkart Square', size: '1:1', desc: '1000x1000px' },
      { id: 'amazon_rect', label: 'Amazon Rectangle', size: '4:3', desc: '2000x1500px' },
      { id: 'instagram', label: 'Instagram Post', size: '1:1', desc: '1080x1080px' },
      { id: 'story', label: 'Story/Reel', size: '9:16', desc: '1080x1920px' },
      { id: 'banner', label: 'Banner/Ad', size: '16:9', desc: '1920x1080px' },
    ]
  });
});

// Generate scene
router.post('/generate',
  upload.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'background_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        product_name, product_category, surface_type, surface_description,
        selected_props, output_format, custom_prompt, lighting_style,
        product_position, show_shadow, platform
      } = req.body;

      if (!req.files?.product_image) {
        return res.status(400).json({ error: 'Product image required' });
      }

      // Check credits (2 per scene)
      const { rows: creditRows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [req.user.id]);
      const balance = creditRows[0]?.balance || 0;
      if (balance < 2) return res.status(402).json({ error: 'Insufficient credits. Need 2 credits per scene.' });

      const productImagePath = req.files.product_image[0].path;
      const backgroundImagePath = req.files?.background_image?.[0]?.path || null;

      let parsedProps = [];
      try { parsedProps = JSON.parse(selected_props || '[]'); } catch {}

      const sceneConfig = {
        product_name: product_name || 'Product',
        product_category: product_category || 'item',
        surface_type: surface_type || 'table',
        surface_description: surface_description || '',
        selected_props: parsedProps,
        output_format: output_format || 'flipkart_square',
        custom_prompt: custom_prompt || '',
        lighting_style: lighting_style || 'soft_natural',
        product_position: product_position || 'center',
        show_shadow: show_shadow === 'true',
        platform: platform || 'flipkart'
      };

      const results = await generateProductScene(
        productImagePath,
        backgroundImagePath,
        sceneConfig
      );

      if (!results.length) {
        return res.status(500).json({ error: 'Scene generation failed. Check Gemini API key and quota.' });
      }

      await useCredits(req.user.id, 2);

      const savedImages = [];
      for (const r of results) {
        const buf = Buffer.from(r.imageData, 'base64');
        const savedUrl = await saveImage(buf, req.user.id, `scene_${uuidv4()}.jpg`);
        savedImages.push({
          url: savedUrl,
          format: r.format,
          variant: r.variant
        });
      }

      // Save to DB
      await query(
        'INSERT INTO scene_builds (owner_id, product_image, background_image, config, result_images, credits_used) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.user.id, productImagePath, backgroundImagePath, JSON.stringify(sceneConfig), JSON.stringify(savedImages), 2]
      );

      await query(
        'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
        [req.user.id, 'use', 2, `Scene build: ${product_name || 'Product'}`]
      );

      res.json({ success: true, images: savedImages, credits_used: 2 });

    } catch (err) {
      const status = err.message === 'Insufficient credits' ? 402 : 500;
      res.status(status).json({ error: err.message });
    }
  }
);

// Get history
router.get('/history', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM scene_builds WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI suggest endpoint
router.post('/suggest', async (req, res) => {
  try {
    const { product_name, product_category, bg_description } = req.body;
    const suggestion = await generateScenePrompt(
      { name: product_name || 'Product', category: product_category || 'item' },
      bg_description || ''
    );
    res.json(suggestion);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
