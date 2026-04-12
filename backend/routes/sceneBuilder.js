import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { generateProductScene, generateScenePrompt } from '../services/sceneBuilderAgent.js';
import { uploadToCloudinary, uploadFileToCloudinary, isCloudinaryEnabled } from '../services/cloudinaryService.js';

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

const ensureCreditsAvailable = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || rows[0].balance < amount) throw new Error('Insufficient credits');
};

const useCredits = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || rows[0].balance < amount) throw new Error('Insufficient credits');
  await query('UPDATE credits SET balance=balance-$1, total_used=total_used+$1, updated_at=NOW() WHERE owner_id=$2', [amount, userId]);
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
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
    prop_items: {
      table: [
        { id: 'flowers', label: 'Flowers', emoji: '💐' },
        { id: 'candles', label: 'Candles', emoji: '🕯️' },
        { id: 'leaves', label: 'Leaves/Plants', emoji: '🌿' },
        { id: 'coffee_cup', label: 'Coffee Cup', emoji: '☕' },
        { id: 'books', label: 'Books', emoji: '📚' },
        { id: 'fabric', label: 'Fabric/Cloth', emoji: '🧣' },
        { id: 'stones', label: 'Pebbles', emoji: '🪨' },
        { id: 'fruits', label: 'Fruits', emoji: '🍋' },
      ],
      shelf: [
        { id: 'books', label: 'Books', emoji: '📚' },
        { id: 'small_plant', label: 'Small Plant', emoji: '🪴' },
        { id: 'photo_frame', label: 'Photo Frame', emoji: '🖼️' },
        { id: 'candles', label: 'Candles', emoji: '🕯️' },
        { id: 'clock', label: 'Clock', emoji: '🕐' },
        { id: 'vase', label: 'Vase', emoji: '🏺' },
      ],
      floor: [
        { id: 'leaves', label: 'Leaves', emoji: '🍂' },
        { id: 'stones', label: 'Stones', emoji: '🪨' },
        { id: 'fabric', label: 'Fabric', emoji: '🧣' },
        { id: 'flowers', label: 'Flowers', emoji: '💐' },
        { id: 'wooden_crate', label: 'Wooden Crate', emoji: '📦' },
      ],
      car_dashboard: [
        { id: 'air_freshener', label: 'Air Freshener', emoji: '🌬️' },
        { id: 'sunglasses', label: 'Sunglasses', emoji: '🕶️' },
        { id: 'phone_mount', label: 'Phone Mount', emoji: '📱' },
        { id: 'car_keys', label: 'Car Keys', emoji: '🔑' },
        { id: 'steering_cover', label: 'Steering Cover', emoji: '🎡' },
      ],
      car_seat: [
        { id: 'sunglasses', label: 'Sunglasses', emoji: '🕶️' },
        { id: 'car_keys', label: 'Car Keys', emoji: '🔑' },
        { id: 'shopping_bag', label: 'Shopping Bag', emoji: '🛍️' },
        { id: 'jacket', label: 'Jacket', emoji: '🧥' },
        { id: 'water_bottle', label: 'Water Bottle', emoji: '💧' },
      ],
      bed: [
        { id: 'cushions', label: 'Cushions', emoji: '🛋️' },
        { id: 'flowers', label: 'Flowers', emoji: '💐' },
        { id: 'candles', label: 'Candles', emoji: '🕯️' },
        { id: 'books', label: 'Books', emoji: '📚' },
        { id: 'fabric', label: 'Fabric', emoji: '🧣' },
      ],
      custom: [
        { id: 'flowers', label: 'Flowers', emoji: '💐' },
        { id: 'candles', label: 'Candles', emoji: '🕯️' },
        { id: 'leaves', label: 'Leaves', emoji: '🌿' },
        { id: 'fabric', label: 'Fabric', emoji: '🧣' },
        { id: 'jewelry', label: 'Jewelry', emoji: '💍' },
        { id: 'watch', label: 'Watch', emoji: '⌚' },
      ],
    },
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
    let productId = null;
    let movedToProcessing = false;
    const sceneCreditCost = 2;
    const taskId = uuidv4();

    try {
      const {
        product_name, product_category, surface_type, surface_description,
        selected_props, output_format, custom_prompt, lighting_style,
        product_position, show_shadow, platform
      } = req.body;

      if (!req.files?.product_image) {
        return res.status(400).json({ error: 'Product image required' });
      }

      await ensureCreditsAvailable(req.user.id, sceneCreditCost);

      const productImagePath = req.files.product_image[0].path;
      const backgroundImagePath = req.files?.background_image?.[0]?.path || null;

      let parsedProps = [];
      if (Array.isArray(selected_props)) {
        parsedProps = selected_props.map((value) => String(value || '').trim()).filter(Boolean);
      } else {
        try {
          parsedProps = JSON.parse(selected_props || '[]');
        } catch {
          parsedProps = String(selected_props || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        }
      }

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
        show_shadow: parseBoolean(show_shadow, true),
        platform: platform || 'flipkart'
      };

      const results = await generateProductScene(
        productImagePath,
        backgroundImagePath,
        sceneConfig
      );

      if (!results.length) {
        return res.status(500).json({ error: 'Scene generation failed. Check Vertex AI key and quota.' });
      }

      const storedProductImage = await saveUploadedFile(productImagePath, req.user.id);
      const storedBackgroundImage = backgroundImagePath
        ? await saveUploadedFile(backgroundImagePath, req.user.id)
        : null;

      const descriptionParts = [
        sceneConfig.surface_description,
        sceneConfig.custom_prompt
      ].map((value) => String(value || '').trim()).filter(Boolean);

      const { rows: productRows } = await query(
        'INSERT INTO products (owner_id, name, category, description, original_image, status, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
        [
          req.user.id,
          sceneConfig.product_name || 'Scene Product',
          sceneConfig.product_category || 'item',
          descriptionParts.join(' | ') || null,
          storedProductImage,
          'processing'
        ]
      );

      const product = productRows[0];
      productId = product.id;
      movedToProcessing = true;

      const savedImages = [];
      for (let index = 0; index < results.length; index += 1) {
        const r = results[index];
        const buf = Buffer.from(r.imageData, 'base64');
        const savedUrl = await saveImage(buf, req.user.id, `scene_${uuidv4()}.jpg`);

        await query(
          'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, platform, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [
            product.id,
            req.user.id,
            'scene',
            r.format || sceneConfig.output_format,
            savedUrl,
            sceneConfig.platform,
            index === 0 ? sceneCreditCost : 0,
            JSON.stringify({
              task_id: taskId,
              task_kind: 'scene_builder',
              variant: r.variant || `variant_${index + 1}`,
              format: r.format || sceneConfig.output_format,
              surface_type: sceneConfig.surface_type,
              lighting_style: sceneConfig.lighting_style,
              source: 'scene_builder'
            })
          ]
        );

        savedImages.push({
          url: savedUrl,
          format: r.format || sceneConfig.output_format,
          variant: r.variant || `variant_${index + 1}`
        });
      }

      // Save to DB
      await query(
        'INSERT INTO scene_builds (owner_id, product_image, background_image, config, result_images, credits_used) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.user.id, storedProductImage, storedBackgroundImage, JSON.stringify(sceneConfig), JSON.stringify(savedImages), sceneCreditCost]
      );

      await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', product.id]);

      await useCredits(req.user.id, sceneCreditCost);

      await query(
        'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
        [req.user.id, 'use', sceneCreditCost, `Scene build: ${sceneConfig.product_name || 'Product'}`]
      );

      res.json({
        success: true,
        product_id: product.id,
        images: savedImages,
        credits_used: sceneCreditCost,
        task_id: taskId
      });

    } catch (err) {
      if (productId && movedToProcessing) {
        try {
          await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', productId]);
        } catch {
          // Keep original error response if status update also fails.
        }
      }
      let status = 500;
      if (err.message === 'Insufficient credits') status = 402;
      else if (err.code === 'GEMINI_QUOTA_EXCEEDED') status = 503;
      else if (['GEMINI_KEY_INVALID', 'GEMINI_KEY_MISSING', 'GEMINI_KEY_REVOKED', 'GEMINI_MODEL_UNAVAILABLE', 'GEMINI_PERMISSION_DENIED', 'GEMINI_BAD_REQUEST', 'GEMINI_BAD_RESPONSE_FORMAT', 'GEMINI_VERTEX_CONFIG_MISSING'].includes(err.code)) status = 502;
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
