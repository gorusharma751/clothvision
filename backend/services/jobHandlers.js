import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import {
  generateTryOn,
  generateProductBG,
  generate360View,
  generateCustomerTryOn,
  setAdminPrompts
} from './geminiAgents.js';
import {
  uploadToCloudinary,
  uploadFileToCloudinary,
  uploadVideoToCloudinary,
  isCloudinaryEnabled
} from './cloudinaryService.js';
import { getClient, getImageModelName, getTextModelName, getVideoModelName } from './genaiClient.js';

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

const isRemoteUrl = (value = '') => /^https?:\/\//i.test(String(value));

const getMimeType = (filePath) => {
  let extTarget = filePath;
  if (isRemoteUrl(filePath)) {
    try {
      extTarget = new URL(filePath).pathname;
    } catch {
      extTarget = filePath;
    }
  }

  const ext = path.extname(extTarget).toLowerCase();
  return (
    {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    }[ext] || 'image/jpeg'
  );
};

const toBase64 = async (filePath) => {
  if (isRemoteUrl(filePath)) {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to fetch remote image (${response.status})`);
    return Buffer.from(await response.arrayBuffer()).toString('base64');
  }

  return fs.readFileSync(filePath).toString('base64');
};

const saveImage = async (buffer, userId, fileName, folder = '') => {
  if (isCloudinaryEnabled()) {
    const cleanedFolder = String(folder || '').trim();
    const targetFolder = cleanedFolder
      ? `clothvision/${userId}/${cleanedFolder}`
      : `clothvision/${userId}`;
    return await uploadToCloudinary(buffer, { folder: targetFolder });
  }

  const outPath = path.join(ensureDir(userId), fileName).replace(/\\/g, '/');
  fs.writeFileSync(outPath, buffer);
  return outPath;
};

const saveGeneratedVideo = async (buffer, userId, fileName, folder = 'videos') => {
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

const saveUploadedImage = async (filePath, userId, folder = 'uploads') => {
  if (!isCloudinaryEnabled()) return filePath;

  try {
    const cloudUrl = await uploadFileToCloudinary(filePath, { folder: `clothvision/${userId}/${folder}` });
    if (cloudUrl) return cloudUrl;
  } catch (err) {
    console.error('Cloudinary upload failed for stored upload:', err.message);
  }

  return filePath;
};

const loadAdminPrompts = async () => {
  try {
    const { rows } = await query("SELECT key, value FROM admin_settings WHERE category='ai_prompts'");
    const prompts = {};
    for (const row of rows) prompts[row.key] = row.value;
    setAdminPrompts(prompts);
  } catch (err) {
    console.error('Failed loading admin prompts:', err.message);
    setAdminPrompts({});
  }
};

const getCreditCosts = async (userId) => {
  const { rows } = await query(
    'SELECT ps.credits_per_image, ps.tryon_credits, ps.upscale_credits FROM shops s JOIN plan_settings ps ON ps.plan_name = s.plan WHERE s.owner_id=$1',
    [userId]
  );
  return rows[0] || { credits_per_image: 8, tryon_credits: 3, upscale_credits: 2 };
};

const getPlanCreditsPerImage = async (userId) => {
  const { rows } = await query(
    'SELECT ps.credits_per_image FROM shops s JOIN plan_settings ps ON ps.plan_name=s.plan WHERE s.owner_id=$1',
    [userId]
  );
  return Number(rows[0]?.credits_per_image || 1);
};

const ensureCreditsAvailable = async (userId, amount) => {
  const { rows } = await query('SELECT balance FROM credits WHERE owner_id=$1', [userId]);
  if (!rows.length || Number(rows[0].balance) < Number(amount)) {
    throw new Error('Insufficient credits');
  }
};

const useCredits = async (userId, amount) => {
  const parsedAmount = Number(amount) || 0;
  const { rows, rowCount } = await query(
    `UPDATE credits
     SET balance = balance - $1,
         total_used = total_used + $1,
         updated_at = NOW()
     WHERE owner_id = $2
       AND balance >= $1
     RETURNING balance`,
    [parsedAmount, userId]
  );

  if (!rowCount) throw new Error('Insufficient credits');
  return Number(rows[0]?.balance || 0);
};

const safeParseJson = (raw, fallback) => {
  try {
    const cleaned = String(raw || '').replace(/```json|```/gi, '').trim();
    return cleaned ? JSON.parse(cleaned) : fallback;
  } catch {
    return fallback;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getVideoAspectRatio = (platform) => {
  const verticalPlatforms = new Set(['instagram_reel', 'youtube_short', 'facebook_reel', 'tiktok']);
  return verticalPlatforms.has(platform) ? '9:16' : '16:9';
};

const normalizeVideoDurationSec = (duration) => {
  const parsed = Number(duration);
  if (!Number.isFinite(parsed)) return 8;
  return Math.max(5, Math.min(8, Math.round(parsed)));
};

const buildAiVideoPrompt = ({ script, brandName, productName, tone, objective, callToAction, platform }) => {
  const scenes = Array.isArray(script?.storyboard) ? script.storyboard : [];
  const storyboardText = scenes
    .map((scene, idx) => `${idx + 1}. ${scene.scene} | Visual: ${scene.visual} | Overlay: ${scene.text_overlay} | Voice: ${scene.voiceover}`)
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
    ? errorObject.details.map((item) => String(item?.message || item || '').trim()).filter(Boolean).join('; ')
    : '';

  if (nested) return nested;
  return String(errorObject.error?.message || '').trim();
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

const processProductsGenerateJob = async (job) => {
  const payload = job?.input || {};
  const userId = String(job?.user_id || payload.userId || '').trim();
  const productId = String(payload.productId || '').trim();
  const modelImagePath = String(payload.modelImagePath || '').trim();
  const angleList = Array.isArray(payload.angles) && payload.angles.length
    ? payload.angles
    : ['front', 'back', 'left_side', 'right_side'];

  if (!userId) throw new Error('Job missing user_id');
  if (!productId) throw new Error('Job missing productId');
  if (!modelImagePath) throw new Error('Job missing model image path');

  await loadAdminPrompts();

  const { rows: products } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [productId, userId]);
  if (!products.length) throw new Error('Product not found');
  const product = products[0];

  const costs = await getCreditCosts(userId);
  const totalCredits = angleList.length * Number(costs.credits_per_image || 1);
  await ensureCreditsAvailable(userId, totalCredits);

  await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', product.id]);

  try {
    const results = [];
    const generationErrors = [];

    for (const [index, angle] of angleList.entries()) {
      try {
        const result = await generateTryOn(modelImagePath, product.original_image, product, angle, {
          poseVariant: index,
          customPromptExtra: payload.customPromptExtra || ''
        });

        if (!result?.success) {
          generationErrors.push(`${angle}: ${result?.error || 'No image generated'}`);
          continue;
        }

        const imageBuffer = Buffer.from(result.imageData, 'base64');
        const savedUrl = await saveImage(imageBuffer, userId, `gen_${uuidv4()}.jpg`);

        const { rows } = await query(
          'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, platform, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
          [
            product.id,
            userId,
            'tryon',
            angle,
            savedUrl,
            payload.platform || 'general',
            costs.credits_per_image,
            JSON.stringify({ task_id: job.id, task_kind: 'tryon', angle, pose: result.pose || null })
          ]
        );

        results.push(rows[0]);
      } catch (err) {
        generationErrors.push(`${angle}: ${err.message}`);
      }
    }

    if (!results.length) throw new Error(generationErrors[0] || 'Image generation failed');

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', product.id]);

    const actualCredits = results.length * Number(costs.credits_per_image || 1);
    await useCredits(userId, actualCredits);

    await query(
      'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
      [
        userId,
        'use',
        actualCredits,
        `Generated ${results.length} try-on images for "${product.name}" (${costs.credits_per_image}/image = ${actualCredits})`
      ]
    );

    return {
      success: true,
      images: results,
      task_id: job.id,
      credits_used: actualCredits,
      credits_per_image: Number(costs.credits_per_image || 1),
      generated_count: results.length,
      generation_errors: generationErrors
    };
  } catch (err) {
    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', product.id]);
    throw err;
  }
};

const processProductsGenerateBgJob = async (job) => {
  const payload = job?.input || {};
  const userId = String(job?.user_id || payload.userId || '').trim();
  const productId = String(payload.productId || '').trim();

  if (!userId) throw new Error('Job missing user_id');
  if (!productId) throw new Error('Job missing productId');

  await loadAdminPrompts();

  const { rows: products } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [productId, userId]);
  if (!products.length) throw new Error('Product not found');
  const product = products[0];

  const costs = await getCreditCosts(userId);
  await ensureCreditsAvailable(userId, costs.credits_per_image);
  await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', product.id]);

  try {
    const result = await generateProductBG(product.original_image, product, payload.bgStyle || 'studio', {
      customPromptExtra: payload.customPromptExtra || '',
      customBGDescription: payload.customBGDescription || ''
    });

    if (!result?.success) throw new Error('Image generation failed');

    const imageBuffer = Buffer.from(result.imageData, 'base64');
    const savedUrl = await saveImage(imageBuffer, userId, `bg_${uuidv4()}.jpg`);

    const { rows } = await query(
      'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [
        product.id,
        userId,
        'bg_only',
        payload.bgStyle || 'studio',
        savedUrl,
        costs.credits_per_image,
        JSON.stringify({ task_id: job.id, task_kind: 'bg_only', bg_style: payload.bgStyle || 'studio' })
      ]
    );

    await useCredits(userId, costs.credits_per_image);
    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', product.id]);
    await query(
      'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
      [
        userId,
        'use',
        costs.credits_per_image,
        `BG generation for "${product.name}" (${costs.credits_per_image}/image)`
      ]
    );

    return {
      success: true,
      image: rows[0],
      task_id: job.id,
      credits_used: Number(costs.credits_per_image || 1),
      credits_per_image: Number(costs.credits_per_image || 1)
    };
  } catch (err) {
    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', product.id]);
    throw err;
  }
};

const processProductsGenerate360Job = async (job) => {
  const payload = job?.input || {};
  const userId = String(job?.user_id || payload.userId || '').trim();
  const productId = String(payload.productId || '').trim();
  const modelImagePath = payload.modelImagePath ? String(payload.modelImagePath).trim() : null;

  if (!userId) throw new Error('Job missing user_id');
  if (!productId) throw new Error('Job missing productId');

  await loadAdminPrompts();

  const { rows: products } = await query('SELECT * FROM products WHERE id=$1 AND owner_id=$2', [productId, userId]);
  if (!products.length) throw new Error('Product not found');
  const product = products[0];

  const costs = await getCreditCosts(userId);
  const maxCredits = 4 * Number(costs.credits_per_image || 1);
  await ensureCreditsAvailable(userId, maxCredits);
  await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', product.id]);

  try {
    const results = await generate360View(product.original_image, modelImagePath, product, {
      customPromptExtra: payload.customPromptExtra || ''
    });

    if (!results.length) throw new Error('360 generation failed');

    const savedImages = [];
    for (const r of results) {
      const imageBuffer = Buffer.from(r.imageData, 'base64');
      const savedUrl = await saveImage(imageBuffer, userId, `360_${uuidv4()}.jpg`);

      const { rows } = await query(
        'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [
          product.id,
          userId,
          'view_360',
          r.angle,
          savedUrl,
          costs.credits_per_image,
          JSON.stringify({ task_id: job.id, task_kind: 'view_360', angle: r.angle })
        ]
      );

      savedImages.push(rows[0]);
    }

    const actualCredits = savedImages.length * Number(costs.credits_per_image || 1);
    await useCredits(userId, actualCredits);
    await query(
      'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
      [userId, 'use', actualCredits, `360 view: "${product.name}"`]
    );

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', product.id]);

    return {
      success: true,
      images: savedImages,
      task_id: job.id,
      credits_used: actualCredits
    };
  } catch (err) {
    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', product.id]);
    throw err;
  }
};

const processProductsGenerate360DirectJob = async (job) => {
  const payload = job?.input || {};
  const userId = String(job?.user_id || payload.userId || '').trim();
  const productImagePath = String(payload.productImagePath || '').trim();
  const modelImagePath = payload.modelImagePath ? String(payload.modelImagePath).trim() : null;

  if (!userId) throw new Error('Job missing user_id');
  if (!productImagePath) throw new Error('Job missing product image path');

  await loadAdminPrompts();

  const costs = await getCreditCosts(userId);
  const maxCredits = 4 * Number(costs.credits_per_image || 1);
  await ensureCreditsAvailable(userId, maxCredits);

  const productDetails = {
    name: payload.productName || 'Product',
    category: payload.productCategory || 'clothing',
    color: payload.productColor || ''
  };

  const results = await generate360View(productImagePath, modelImagePath, productDetails, {
    customPromptExtra: payload.customPromptExtra || ''
  });

  if (!results.length) throw new Error('360 generation failed');

  const savedImages = [];
  for (const r of results) {
    const imageBuffer = Buffer.from(r.imageData, 'base64');
    const savedUrl = await saveImage(imageBuffer, userId, `360_${uuidv4()}.jpg`);
    savedImages.push({ angle: r.angle, url: savedUrl });
  }

  const actualCredits = savedImages.length * Number(costs.credits_per_image || 1);
  await useCredits(userId, actualCredits);
  await query(
    'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
    [userId, 'use', actualCredits, `360 direct: "${productDetails.name}"`]
  );

  await query(
    'INSERT INTO video_generations (owner_id, video_type, script, frames, credits_used) VALUES ($1,$2,$3,$4,$5)',
    [
      userId,
      'view_360',
      JSON.stringify({ task_id: job.id, source: 'direct' }),
      JSON.stringify(savedImages),
      actualCredits
    ]
  );

  return {
    success: true,
    images: savedImages,
    task_id: job.id,
    credits_used: actualCredits
  };
};

const processProductsCustomerTryOnJob = async (job) => {
  const payload = job?.input || {};
  const userId = String(job?.user_id || payload.userId || '').trim();
  const customerPhotoPath = String(payload.customerPhotoPath || '').trim();
  const productPhotoPath = String(payload.productPhotoPath || '').trim();

  if (!userId) throw new Error('Job missing user_id');
  if (!customerPhotoPath || !productPhotoPath) throw new Error('Job missing try-on image paths');

  await loadAdminPrompts();

  const costs = await getCreditCosts(userId);
  await ensureCreditsAvailable(userId, costs.tryon_credits);

  const productDetails = {
    name: payload.productName || 'Product',
    category: payload.productCategory || 'clothing',
    color: payload.productColor || ''
  };

  const results = await generateCustomerTryOn(
    customerPhotoPath,
    productPhotoPath,
    productDetails,
    { customPromptExtra: payload.customPromptExtra || '' }
  );

  if (!results.length) throw new Error('No try-on images generated. Check Vertex AI quota/billing and retry.');

  const savedImages = [];
  for (const r of results) {
    const buf = Buffer.from(r.imageData, 'base64');
    const savedUrl = await saveImage(buf, userId, `ctryon_${uuidv4()}.jpg`);
    savedImages.push({ angle: r.angle, url: savedUrl });
  }

  await useCredits(userId, costs.tryon_credits);

  const { rows } = await query(
    'INSERT INTO customer_tryon (owner_id, customer_photo, product_photo, result_images, credits_used) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [userId, customerPhotoPath, productPhotoPath, JSON.stringify(savedImages), costs.tryon_credits]
  );

  await query(
    'INSERT INTO credit_transactions (owner_id, type, amount, description) VALUES ($1,$2,$3,$4)',
    [userId, 'use', costs.tryon_credits, 'Customer try-on']
  );

  return {
    success: true,
    images: savedImages,
    record: rows[0],
    task_id: job.id
  };
};

const processStudioView360Job = async (job) => {
  const payload = job?.input || {};
  const userId = String(job?.user_id || payload.userId || '').trim();
  const productImagePath = String(payload.productImagePath || '').trim();

  if (!userId) throw new Error('Job missing user_id');
  if (!productImagePath) throw new Error('Job missing product image path');

  const productName = String(payload.productName || 'Product').trim();
  const productCategory = String(payload.productCategory || 'General').trim();
  const productDescription = String(payload.productDescription || '').trim();

  const creditsPerImage = await getPlanCreditsPerImage(userId);
  const angles = ['front', 'left_side', 'back', 'right_side'];
  const maxCreditsNeeded = creditsPerImage * angles.length;
  await ensureCreditsAvailable(userId, maxCreditsNeeded);

  const storedOriginalImage = await saveUploadedImage(productImagePath, userId, 'uploads');
  const { rows: createdRows } = await query(
    'INSERT INTO products (owner_id, name, category, description, original_image, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [userId, productName, productCategory, productDescription, storedOriginalImage, 'processing']
  );

  const productId = createdRows[0]?.id;
  if (!productId) throw new Error('Failed to create product record for 360 job');

  try {
    const anglePrompt = {
      front: 'front-facing centered view of the product',
      left_side: 'left side profile view of the product',
      back: 'back view of the product',
      right_side: 'right side profile view of the product'
    };

    const imageModel = getClient().getGenerativeModel({ model: getImageModelName() });
    const generatedImages = [];
    const errors = [];
    const sourceImageBase64 = await toBase64(productImagePath);
    const sourceImageMime = getMimeType(productImagePath);

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
              data: sourceImageBase64,
              mimeType: sourceImageMime
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
        const imageUrl = await saveImage(imageBuffer, userId, `view360_${angle}_${uuidv4()}.jpg`, 'view360');

        const { rows } = await query(
          'INSERT INTO generated_images (product_id, owner_id, image_type, angle, image_url, platform, credits_used, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
          [
            productId,
            userId,
            'view360',
            angle,
            imageUrl,
            'viewer360',
            creditsPerImage,
            JSON.stringify({ task_id: job.id, task_kind: 'view360', angle })
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
    await useCredits(userId, actualCreditsUsed);
    await query(
      'INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',
      [userId, 'use', actualCreditsUsed, `360 View: ${productName} (${generatedImages.length} angles)`]
    );

    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['generated', productId]);

    return {
      success: true,
      images: generatedImages,
      credits_used: actualCreditsUsed,
      credits_per_image: creditsPerImage,
      generated_count: generatedImages.length,
      generation_errors: errors,
      partial: generatedImages.length < angles.length,
      task_id: job.id
    };
  } catch (err) {
    await query('UPDATE products SET status=$1, updated_at=NOW() WHERE id=$2', ['failed', productId]);
    throw err;
  }
};

const processStudioVideoJob = async (job) => {
  const payload = job?.input || {};
  const userId = String(job?.user_id || payload.userId || '').trim();
  const productImagePath = String(payload.productImagePath || '').trim();

  if (!userId) throw new Error('Job missing user_id');
  if (!productImagePath) throw new Error('Job missing product image path');

  const creditsNeeded = 5;
  await ensureCreditsAvailable(userId, creditsNeeded);

  const brandName = String(payload.brandName || '').trim();
  const productName = String(payload.productName || '').trim();
  const platform = String(payload.platform || 'instagram_reel').trim();
  const duration = Number(payload.duration || 15);
  const tone = String(payload.tone || 'premium').trim();
  const objective = String(payload.objective || 'sales').trim();
  const callToAction = String(payload.callToAction || 'Shop now').trim();

  const genAI = getClient();
  const sourceImageBase64 = await toBase64(productImagePath);
  const sourceImageMime = getMimeType(productImagePath);

  const textModel = genAI.getGenerativeModel({ model: getTextModelName() });
  const fallbackScript = {
    hook: `Turn one ${productName || 'product'} photo into a high-converting short video.`,
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
      const frameUrl = await saveImage(frameBuffer, userId, `video_frame_${uuidv4()}.jpg`, 'videos');
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
    videoUrl = await saveGeneratedVideo(videoBuffer, userId, `video_${uuidv4()}.mp4`, 'videos');
  }

  if (!videoUrl) {
    throw new Error('AI video generation returned no playable video. Verify model access and billing, then retry.');
  }

  const remainingCredits = await useCredits(userId, creditsNeeded);
  await query(
    'INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',
    [userId, 'use', creditsNeeded, `Video Studio: ${productName || brandName || 'AI video generation'}`]
  );

  await query(
    'INSERT INTO video_generations (owner_id, video_type, script, frames, credits_used) VALUES ($1,$2,$3,$4,$5)',
    [
      userId,
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
        operation_name: operation?.name || null,
        task_id: job.id
      }),
      JSON.stringify(frameResults),
      creditsNeeded
    ]
  );

  return {
    success: true,
    script,
    frames: frameResults,
    video_url: videoUrl,
    video_model: videoModel,
    ai_duration_sec: aiDurationSec,
    credits_used: creditsNeeded,
    remaining_credits: remainingCredits,
    task_id: job.id
  };
};

export const runImageJob = async (job) => {
  const operation = String(job?.input?.operation || '').trim();

  if (operation === 'products_generate') return processProductsGenerateJob(job);
  if (operation === 'products_generate_bg') return processProductsGenerateBgJob(job);
  if (operation === 'products_generate_360') return processProductsGenerate360Job(job);
  if (operation === 'products_generate_360_direct') return processProductsGenerate360DirectJob(job);
  if (operation === 'products_customer_tryon') return processProductsCustomerTryOnJob(job);
  if (operation === 'studio_view360') return processStudioView360Job(job);

  throw new Error(`Unsupported image job operation: ${operation || 'unknown'}`);
};

export const runVideoJob = async (job) => {
  const operation = String(job?.input?.operation || '').trim();

  if (operation === 'studio_video') return processStudioVideoJob(job);

  throw new Error(`Unsupported video job operation: ${operation || 'unknown'}`);
};
