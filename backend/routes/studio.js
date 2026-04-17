import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import {
  uploadToCloudinary,
  uploadFileToCloudinary,
  uploadVideoToCloudinary,
  isCloudinaryEnabled
} from '../services/cloudinaryService.js';
import { getClient, getImageModelName, getTextModelName, getVideoModelName } from '../services/genaiClient.js';
import { createJob } from '../services/jobService.js';

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

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    }[ext] || 'image/jpeg'
  );
};

const toBase64 = (filePath) => fs.readFileSync(filePath).toString('base64');

const saveGeneratedImage = async (buffer, userId, fileName, folder) => {
  if (isCloudinaryEnabled()) {
    return await uploadToCloudinary(buffer, { folder: `clothvision/${userId}/${folder}` });
  }
  const outPath = path.join(ensureDir(userId), fileName).replace(/\\/g, '/');
  fs.writeFileSync(outPath, buffer);
  return outPath;
};

const saveUploadedImage = async (filePath, userId, folder) => {
  if (!isCloudinaryEnabled()) return filePath;
  try {
    const cloudUrl = await uploadFileToCloudinary(filePath, { folder: `clothvision/${userId}/${folder}` });
    if (cloudUrl) return cloudUrl;
  } catch (err) {
    console.error('Cloudinary upload failed for studio upload:', err.message);
  }
  return filePath;
};

const saveGeneratedVideo = async (buffer, userId, fileName, folder) => {
  if (isCloudinaryEnabled()) {
    try {
      const cloudUrl = await uploadVideoToCloudinary(buffer, { folder: `clothvision/${userId}/${folder}` });
      if (cloudUrl) return cloudUrl;
    } catch (err) {
      console.error('Cloudinary video upload failed:', err.message);
    }
  }
  const outPath = path.join(ensureDir(userId), fileName).replace(/\\/g, '/');
  fs.writeFileSync(outPath, buffer);
  return outPath;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getVideoAspectRatio = (platform) => {
  const verticalPlatforms = new Set(['instagram_reel', 'youtube_short', 'facebook_reel', 'tiktok']);
  return verticalPlatforms.has(platform) ? '9:16' : '16:9';
};

const normalizeVideoDurationSec = (duration) => {
  const parsed = Number(duration);
  if (!Number.isFinite(parsed)) return 8;
  // Veo generations are short-form clips; cap to safe range.
  return Math.max(5, Math.min(8, Math.round(parsed)));
};

const buildAiVideoPrompt = ({ script, brandName, productName, tone, objective, callToAction, platform }) => {
  const scenes = Array.isArray(script?.storyboard) ? script.storyboard : [];
  const storyboardText = scenes
    .map((scene, idx) => {
      return `${idx + 1}. ${scene.scene} | Visual: ${scene.visual} | Overlay: ${scene.text_overlay} | Voice: ${scene.voiceover}`;
    })
    .join('\n');

  return `Create a premium short-form product advertisement video.

Platform: ${platform}
Brand: ${brandName || 'Brand'}
Product: ${productName || 'Product'}
Tone: ${tone}
Objective: ${objective}
Primary call-to-action: ${callToAction}

Hook: ${script?.hook || ''}
Caption direction: ${script?.caption || ''}
Storyboard:
${storyboardText || '1. Hero product shot with smooth camera move.'}

Hard requirements:
1. Keep product shape, texture, and colors consistent with the source image.
2. Cinematic movement (push-in, parallax, subtle orbit), no slideshow effect.
3. Clean ad-ready look with professional lighting.
4. No watermarks, no text artifacts.
5. Produce a complete coherent motion clip, not still frames.`;
};

const extractOperationErrorMessage = (errorObject) => {
  if (!errorObject || typeof errorObject !== 'object') return '';
  const primary = String(errorObject.message || '').trim();
  if (primary) return primary;

  const nested = Array.isArray(errorObject.details)
    ? errorObject.details
        .map((item) => String(item?.message || item || '').trim())
        .filter(Boolean)
        .join('; ')
    : '';
  if (nested) return nested;

  return String(errorObject.error?.message || '').trim();
};

const ensureCreditsAvailable = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || Number(rows[0].balance) < amount) throw new Error('Insufficient credits');
};

const useCredits = async (userId, amount) => {
  const { rows, rowCount } = await query(
    `UPDATE credits
     SET balance = balance - $1,
         total_used = total_used + $1,
         updated_at = NOW()
     WHERE owner_id = $2
       AND balance >= $1
     RETURNING balance`,
    [amount, userId]
  );

  if (!rowCount) throw new Error('Insufficient credits');
  return Number(rows[0]?.balance || 0);
};

const getPlanCreditsPerImage = async (userId) => {
  const { rows } = await query(
    'SELECT ps.credits_per_image FROM shops s JOIN plan_settings ps ON ps.plan_name=s.plan WHERE s.owner_id=$1',
    [userId]
  );
  return Number(rows[0]?.credits_per_image || 1);
};

const safeParseJson = (raw, fallback) => {
  try {
    const cleaned = String(raw || '').replace(/```json|```/gi, '').trim();
    return cleaned ? JSON.parse(cleaned) : fallback;
  } catch {
    return fallback;
  }
};

const extractGeneratedImage = (result) => {
  const parts = result?.response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part?.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/jpeg'
      };
    }
  }
  return null;
};

const getErrorStatusCode = (err) => {
  if (err?.message === 'Insufficient credits') return 402;
  const raw = String(err?.message || '').toLowerCase();
  if (raw.includes('timed out')) return 504;
  if (raw.includes('quota') || raw.includes('429') || raw.includes('resource exhausted')) return 503;
  if (raw.includes('api key') || raw.includes('permission denied') || raw.includes('forbidden')) return 502;
  return 500;
};

router.post('/label', upload.fields([{ name: 'product_image' }, { name: 'logo' }]), async (req, res) => {
  try {
    const productImage = req.files?.product_image?.[0];
    const logoImage = req.files?.logo?.[0] || null;
    if (!productImage) return res.status(400).json({ error: 'Product image is required' });

    const creditsNeeded = 2;
    await ensureCreditsAvailable(req.user.id, creditsNeeded);

    const style = String(req.body.label_style || 'minimal').trim();
    const brandName = String(req.body.brand_name || '').trim();
    const productName = String(req.body.product_name || '').trim();
    const tagline = String(req.body.tagline || '').trim();
    const details = String(req.body.details || '').trim();

    const model = getClient().getGenerativeModel({ model: getImageModelName() });
    const parts = [
      {
        inlineData: {
          data: toBase64(productImage.path),
          mimeType: getMimeType(productImage.path)
        }
      }
    ];

    if (logoImage) {
      parts.push({
        inlineData: {
          data: toBase64(logoImage.path),
          mimeType: getMimeType(logoImage.path)
        }
      });
    }

    parts.push({
      text: `Create a professional ${style} product label / hang tag design.

Product: ${productName || 'Product'}
Brand: ${brandName || 'Brand'}
Tagline: ${tagline || 'Premium Quality'}
Extra details: ${details || 'Clean, readable text with balanced spacing'}

Requirements:
1. Keep product identity and colors consistent with input image.
2. Label should look print-ready, premium, and readable.
3. Include clear typography hierarchy: brand, product name, small details.
4. Use a clean background and no watermark.
5. Output a single realistic label design image.
${logoImage ? '6. Integrate provided logo naturally in the label design.' : ''}`
    });

    const result = await model.generateContent(parts);
    const generated = extractGeneratedImage(result);
    if (!generated) return res.status(500).json({ error: 'Label generation failed: no image output' });

    const imageBuffer = Buffer.from(generated.data, 'base64');
    const imageUrl = await saveGeneratedImage(imageBuffer, req.user.id, `label_${uuidv4()}.jpg`, 'labels');
    const storedProductImage = await saveUploadedImage(productImage.path, req.user.id, 'uploads');

    await useCredits(req.user.id, creditsNeeded);
    await query(
      'INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'use', creditsNeeded, `Label Creator: ${brandName || productName || 'Label'}`]
    );

    await query(
      'INSERT INTO label_generations (owner_id, product_image, config, result_url, credits_used) VALUES ($1,$2,$3,$4,$5)',
      [
        req.user.id,
        storedProductImage,
        JSON.stringify({ style, brand_name: brandName, product_name: productName, tagline, details, source: 'label_creator' }),
        imageUrl,
        creditsNeeded
      ]
    );

    res.json({ success: true, image_url: imageUrl, credits_used: creditsNeeded });
  } catch (err) {
    res.status(getErrorStatusCode(err)).json({ error: err.message || 'Label generation failed' });
  }
});

router.post('/video', upload.single('product_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Product image is required' });

    const storedProductImage = await saveUploadedImage(req.file.path, req.user.id, 'uploads');

    const job = await createJob({
      userId: req.user.id,
      type: 'video',
      input: {
        operation: 'studio_video',
        productImagePath: storedProductImage,
        brandName: req.body.brand_name || '',
        productName: req.body.product_name || '',
        platform: req.body.platform || 'instagram_reel',
        duration: Number(req.body.duration || 15),
        tone: req.body.tone || 'premium',
        objective: req.body.objective || 'sales',
        callToAction: req.body.cta || 'Shop now'
      }
    });

    console.log(`[jobs] created job=${job.id} type=video op=studio_video user=${req.user.id}`);
    return res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

router.post('/view360', upload.single('product_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Product image is required' });

    const storedProductImage = await saveUploadedImage(req.file.path, req.user.id, 'uploads');
    const job = await createJob({
      userId: req.user.id,
      type: 'image',
      input: {
        operation: 'studio_view360',
        productImagePath: storedProductImage,
        productName: req.body.product_name || 'Product',
        productCategory: req.body.product_category || 'General',
        productDescription: req.body.product_description || ''
      }
    });

    console.log(`[jobs] created job=${job.id} type=image op=studio_view360 user=${req.user.id}`);
    return res.status(202).json({ jobId: job.id, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

export default router;
