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

    const creditsNeeded = 5;
    await ensureCreditsAvailable(req.user.id, creditsNeeded);

    const brandName = String(req.body.brand_name || '').trim();
    const productName = String(req.body.product_name || '').trim();
    const platform = String(req.body.platform || 'instagram_reel').trim();
    const duration = Number(req.body.duration || 15);
    const tone = String(req.body.tone || 'premium').trim();
    const objective = String(req.body.objective || 'sales').trim();
    const callToAction = String(req.body.cta || 'Shop now').trim();

    const genAI = getClient();
    const sourceImageBase64 = toBase64(req.file.path);
    const sourceImageMime = getMimeType(req.file.path);

    const textModel = genAI.getGenerativeModel({ model: getTextModelName() });
    const fallbackScript = {
      hook: `Turn one ${productName || 'product'} photo into a high-converting short video.` ,
      caption: `${brandName || 'Brand'} ${productName || 'product'} now available. ${callToAction}`,
      hashtags: ['#ecommerce', '#productvideo', '#aicontent'],
      motion_prompt: `Cinematic vertical ad video for ${productName || 'product'} with smooth camera moves and premium lighting.`,
      storyboard: [
        {
          scene: 'Hook shot',
          visual: 'Close-up hero shot of product with dynamic light',
          text_overlay: `${brandName || 'Brand'} presents`,
          voiceover: `Meet the new ${productName || 'product'}.`,
          duration_sec: 4
        },
        {
          scene: 'Feature shot',
          visual: 'Highlight key material/quality details',
          text_overlay: 'Built for quality',
          voiceover: 'Designed for quality, style, and everyday use.',
          duration_sec: 5
        },
        {
          scene: 'CTA shot',
          visual: 'Product centered with clean background and motion',
          text_overlay: callToAction,
          voiceover: callToAction,
          duration_sec: Math.max(3, duration - 9)
        }
      ]
    };

    const prompt = `You are a short-form video ad strategist.
Generate a commercial script for ${platform}.

Brand: ${brandName || 'Brand'}
Product: ${productName || 'Product'}
Duration: ${duration} seconds
Tone: ${tone}
Objective: ${objective}
Call to action: ${callToAction}

Return ONLY valid JSON with this exact schema:
{
  "hook": "string",
  "caption": "string",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "motion_prompt": "single complete prompt for AI video generation",
  "storyboard": [
    {
      "scene": "short title",
      "visual": "camera + composition instruction",
      "text_overlay": "short overlay",
      "voiceover": "spoken line",
      "duration_sec": 3
    }
  ]
}

Rules:
- storyboard should have 3 to 5 scenes.
- Keep language concise, high-converting, and platform-ready.
- Duration should approximately total ${duration} seconds.`;

    const scriptResult = await textModel.generateContent(prompt);
    let script = safeParseJson(scriptResult?.response?.text?.(), fallbackScript);

    if (!Array.isArray(script.storyboard) || !script.storyboard.length) {
      script.storyboard = fallbackScript.storyboard;
    }
    if (!Array.isArray(script.hashtags) || !script.hashtags.length) {
      script.hashtags = fallbackScript.hashtags;
    }
    script.motion_prompt = String(script.motion_prompt || fallbackScript.motion_prompt || '').trim();

    script.storyboard = script.storyboard.slice(0, 5).map((scene, idx) => ({
      scene: String(scene.scene || `Scene ${idx + 1}`),
      visual: String(scene.visual || 'Product-focused cinematic frame'),
      text_overlay: String(scene.text_overlay || ''),
      voiceover: String(scene.voiceover || ''),
      duration_sec: Number(scene.duration_sec || 3)
    }));

    const imageModel = genAI.getGenerativeModel({ model: getImageModelName() });
    const frameTargets = script.storyboard.slice(0, 3);
    const frameResults = [];

    for (let i = 0; i < frameTargets.length; i += 1) {
      const scene = frameTargets[i];
      try {
        const framePrompt = `Create a cinematic keyframe for a short product video ad.

Product: ${productName || 'Product'}
Brand: ${brandName || 'Brand'}
Scene: ${scene.scene}
Visual instruction: ${scene.visual}
Text overlay to leave readable area for: ${scene.text_overlay || callToAction}

Requirements:
1. Keep product shape/design/colors exactly consistent with source image.
2. Make frame high-contrast and ad-ready.
3. No watermark.
4. Photorealistic quality.`;

        const frameContent = [
          {
            inlineData: {
              data: sourceImageBase64,
              mimeType: sourceImageMime
            }
          },
          { text: framePrompt }
        ];

        const frameOutput = await imageModel.generateContent(frameContent);
        const generatedFrame = extractGeneratedImage(frameOutput);
        if (!generatedFrame) continue;

        const frameBuffer = Buffer.from(generatedFrame.data, 'base64');
        const frameUrl = await saveGeneratedImage(frameBuffer, req.user.id, `video_frame_${uuidv4()}.jpg`, 'videos');
        frameResults.push({
          index: i,
          scene: scene.scene,
          text_overlay: scene.text_overlay,
          url: frameUrl
        });
      } catch (frameErr) {
        console.error('Video frame generation skipped:', frameErr.message);
      }
    }

    const videoModel = getVideoModelName();
    const aiDurationSec = normalizeVideoDurationSec(duration);
    const aiVideoPrompt = script.motion_prompt || buildAiVideoPrompt({
      script,
      brandName,
      productName,
      tone,
      objective,
      callToAction,
      platform
    });

    let operation = await genAI.generateVideos({
      model: videoModel,
      source: {
        prompt: aiVideoPrompt,
        image: {
          imageBytes: sourceImageBase64,
          mimeType: sourceImageMime
        }
      },
      config: {
        numberOfVideos: 1,
        durationSeconds: aiDurationSec,
        aspectRatio: getVideoAspectRatio(platform),
        enhancePrompt: true,
        generateAudio: false
      }
    });

    const pollIntervalMs = Math.max(3000, Number(process.env.VIDEO_POLL_INTERVAL_MS || 10000));
    const timeoutMs = Math.max(60000, Number(process.env.VIDEO_GENERATION_TIMEOUT_MS || 480000));
    const startedAt = Date.now();

    while (!operation?.done) {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error('AI video generation timed out. Please retry after a minute.');
      }
      await sleep(pollIntervalMs);
      operation = await genAI.getVideosOperation(operation);
    }

    if (operation?.error) {
      const operationMessage = extractOperationErrorMessage(operation.error);
      throw new Error(operationMessage ? `AI video generation failed: ${operationMessage}` : 'AI video generation failed.');
    }

    const generatedVideo = operation?.response?.generatedVideos?.[0]?.video;
    let videoUrl = String(generatedVideo?.uri || '').trim();

    if (!videoUrl && generatedVideo?.videoBytes) {
      const videoBuffer = Buffer.from(generatedVideo.videoBytes, 'base64');
      videoUrl = await saveGeneratedVideo(videoBuffer, req.user.id, `video_${uuidv4()}.mp4`, 'videos');
    }

    if (!videoUrl) {
      throw new Error('AI video generation returned no playable video. Verify model access and billing, then retry.');
    }

    const remainingCredits = await useCredits(req.user.id, creditsNeeded);
    await query(
      'INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'use', creditsNeeded, `Video Studio: ${productName || brandName || 'AI video generation'}`]
    );

    await query(
      'INSERT INTO video_generations (owner_id, video_type, script, frames, credits_used) VALUES ($1,$2,$3,$4,$5)',
      [
        req.user.id,
        platform,
        JSON.stringify({
          ...script,
          source: 'video_studio',
          tone,
          objective,
          cta: callToAction,
          product_name: productName || null,
          brand_name: brandName || null,
          video_url: videoUrl,
          video_model: videoModel,
          ai_duration_sec: aiDurationSec,
          operation_name: operation?.name || null
        }),
        JSON.stringify(frameResults),
        creditsNeeded
      ]
    );

    res.json({
      success: true,
      script,
      frames: frameResults,
      video_url: videoUrl,
      video_model: videoModel,
      ai_duration_sec: aiDurationSec,
      credits_used: creditsNeeded,
      remaining_credits: remainingCredits
    });
  } catch (err) {
    res.status(getErrorStatusCode(err)).json({ error: err.message || 'Video generation failed' });
  }
});

router.post('/view360', upload.single('product_image'), async (req, res) => {
  let productId = null;
  let createdProduct = false;

  try {
    if (!req.file) return res.status(400).json({ error: 'Product image is required' });

    const productName = String(req.body.product_name || 'Product').trim();
    const productCategory = String(req.body.product_category || 'General').trim();
    const productDescription = String(req.body.product_description || '').trim();

    const creditsPerImage = await getPlanCreditsPerImage(req.user.id);
    const angles = ['front', 'left_side', 'back', 'right_side'];
    const maxCreditsNeeded = creditsPerImage * angles.length;

    await ensureCreditsAvailable(req.user.id, maxCreditsNeeded);

    const storedOriginalImage = await saveUploadedImage(req.file.path, req.user.id, 'uploads');
    const { rows: createdRows } = await query(
      'INSERT INTO products (owner_id, name, category, description, original_image, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [req.user.id, productName, productCategory, productDescription, storedOriginalImage, 'processing']
    );

    productId = createdRows[0]?.id;
    createdProduct = Boolean(productId);

    const anglePrompt = {
      front: 'front-facing centered view of the product',
      left_side: 'left side profile view of the product',
      back: 'back view of the product',
      right_side: 'right side profile view of the product'
    };

    const imageModel = getClient().getGenerativeModel({ model: getImageModelName() });
    const generatedImages = [];
    const errors = [];

    for (const angle of angles) {
      try {
        const prompt = `Create a professional e-commerce product image.

Product name: ${productName}
Category: ${productCategory}
Requested angle: ${anglePrompt[angle]}

Requirements:
1. Keep product color, shape, branding, and texture exactly the same as source.
2. Product only (no human model, no hand).
3. Clean white/light neutral studio background.
4. High-resolution, realistic catalog look.
5. Maintain consistent framing across all angles.`;

        const content = [
          {
            inlineData: {
              data: toBase64(req.file.path),
              mimeType: getMimeType(req.file.path)
            }
          },
          { text: prompt }
        ];

        const result = await imageModel.generateContent(content);
        const generated = extractGeneratedImage(result);
        if (!generated) {
          errors.push(`${angle}: no image output`);
          continue;
        }

        const imageBuffer = Buffer.from(generated.data, 'base64');
        const imageUrl = await saveGeneratedImage(imageBuffer, req.user.id, `view360_${angle}_${uuidv4()}.jpg`, 'view360');

        const { rows } = await query(
          'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, platform, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
          [
            productId,
            req.user.id,
            'view360',
            angle,
            imageUrl,
            'viewer360',
            creditsPerImage,
            JSON.stringify({ task_kind: 'view360', angle })
          ]
        );

        generatedImages.push(rows[0]);
      } catch (angleErr) {
        errors.push(`${angle}: ${angleErr.message}`);
      }
    }

    if (!generatedImages.length) {
      throw new Error(errors[0] || '360 view generation failed');
    }

    const actualCreditsUsed = generatedImages.length * creditsPerImage;
    await useCredits(req.user.id, actualCreditsUsed);
    await query(
      'INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'use', actualCreditsUsed, `360 View: ${productName} (${generatedImages.length} angles)`]
    );

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', productId]);

    res.json({
      success: true,
      images: generatedImages,
      credits_used: actualCreditsUsed,
      credits_per_image: creditsPerImage,
      generated_count: generatedImages.length,
      generation_errors: errors,
      partial: generatedImages.length < angles.length
    });
  } catch (err) {
    if (createdProduct && productId) {
      try {
        await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', productId]);
      } catch {
        // Ignore cleanup errors.
      }
    }
    res.status(getErrorStatusCode(err)).json({ error: err.message || '360 view generation failed' });
  }
});

export default router;
