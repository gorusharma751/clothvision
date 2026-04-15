import { getClient, getImageModelName, getTextModelName } from './genaiClient.js';
import fs from 'fs';
import path from 'path';

const isRemoteUrl = (value = '') => /^https?:\/\//i.test(String(value));

const getProviderLabel = () => 'Vertex AI';

const normalizeGeminiError = (error) => {
  if (['GEMINI_KEY_MISSING', 'GEMINI_VERTEX_CONFIG_MISSING'].includes(error?.code)) {
    return error;
  }

  const raw = error?.message || String(error || 'Vertex request failed');

  if (/reported as leaked|key was reported as leaked|key is revoked|key has been disabled/i.test(raw)) {
    const err = new Error('Vertex API key is revoked (reported leaked). Create a new key and update your local env values.');
    err.code = 'GEMINI_KEY_REVOKED';
    return err;
  }

  if (/API_KEY_INVALID|API key not valid|Please pass a valid API key|invalid api key/i.test(raw)) {
    const err = new Error(`Configured API key is invalid for ${getProviderLabel()}.`);
    err.code = 'GEMINI_KEY_INVALID';
    return err;
  }

  if (/429 Too Many Requests|Quota exceeded|rate-limits|limit:\s*0|RESOURCE_EXHAUSTED|resource exhausted/i.test(raw)) {
    const err = new Error(`${getProviderLabel()} quota exceeded. Check quota/billing on the active provider and retry.`);
    err.code = 'GEMINI_QUOTA_EXCEEDED';
    return err;
  }

  if (/404 Not Found|is not found for API version|not supported for generateContent/i.test(raw)) {
    const err = new Error(`Configured model is unavailable on ${getProviderLabel()}. Update GEMINI_TEXT_MODEL/GEMINI_IMAGE_MODEL.`);
    err.code = 'GEMINI_MODEL_UNAVAILABLE';
    return err;
  }

  if (/403 Forbidden|PERMISSION_DENIED|has not been used in project|billing account|SERVICE_DISABLED/i.test(raw)) {
    const err = new Error(`${getProviderLabel()} is not permitted for this project/key. Enable required APIs and billing, then retry.`);
    err.code = 'GEMINI_PERMISSION_DENIED';
    return err;
  }

  if (/400 Bad Request/i.test(raw)) {
    const err = new Error(`Vertex request rejected (400). Check model/input format and API restrictions. Raw: ${raw}`);
    err.code = 'GEMINI_BAD_REQUEST';
    return err;
  }

  const err = new Error(`Vertex request failed: ${raw}`);
  err.code = 'GEMINI_REQUEST_FAILED';
  return err;
};

const fileToBase64 = async (filePath) => {
  if (isRemoteUrl(filePath)) {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL (${response.status} ${response.statusText})`);
    }
    const data = Buffer.from(await response.arrayBuffer());
    return data.toString('base64');
  }

  const data = fs.readFileSync(filePath);
  return data.toString('base64');
};

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
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return types[ext] || 'image/jpeg';
};

let adminPrompts = {};

export const setAdminPrompts = (prompts) => {
  adminPrompts = prompts && typeof prompts === 'object' ? prompts : {};
};

const getAdminPrompt = (key) => String(adminPrompts?.[key] || '').trim();

const POSE_POOL = {
  front: [
    'standing directly facing forward, confident relaxed pose, weight slightly on one leg, arms at sides',
    'standing facing forward, one hand in pocket, casual stylish pose, slight smile',
    'standing facing forward, arms crossed confidently, strong posture, looking at camera',
    'standing facing forward, one hand adjusting collar/cuff, natural casual look',
    'standing facing forward, slight shoulder turn, hands clasped in front, model pose'
  ],
  back: [
    'turned showing full back view, looking slightly over left shoulder at camera',
    'back to camera, standing tall, full back view, hands at sides',
    'back view, relaxed standing, slight head turn right'
  ],
  left_side: [
    '90 degrees left side profile, one arm slightly forward, natural standing pose',
    'left side view, hand in pocket, casual relaxed profile stance'
  ],
  right_side: [
    '90 degrees right side profile, natural relaxed standing',
    'right side profile, slight forward lean, confident stance'
  ],
  '3_4_front': [
    '45-degree front-left angle, relaxed model pose, looking directly at camera',
    'three-quarter front-left angle, hand gesturing toward product detail',
    '45-degree angle, soft body turn with natural confident expression'
  ],
  walking: [
    'natural walking stride toward camera, confident energetic movement',
    'walking sideways, candid street fashion style, natural movement',
    'walking with purpose, mid-stride, hair with natural movement'
  ]
};

const BG_POOL = [
  'clean pure white studio background, professional soft lighting, subtle drop shadow',
  'very light gray gradient studio background, professional product shot',
  'soft off-white seamless studio background, gentle shadow',
  'clean white with very faint warm gradient, premium listing look'
];

const toSeedIndex = (seed, length) => {
  const parsed = Number(seed);
  if (!Number.isFinite(parsed) || length <= 0) return 0;
  const normalized = Math.abs(Math.trunc(parsed));
  return normalized % length;
};

const getPose = (angle, seed = 0) => {
  const pool = POSE_POOL[angle] || POSE_POOL.front;
  return pool[toSeedIndex(seed, pool.length)] || POSE_POOL.front[0];
};

const getBG = (seed = 0) => BG_POOL[toSeedIndex(seed, BG_POOL.length)] || BG_POOL[0];

const buildStrictRules = (productDetails, extra = '') => `
ABSOLUTE RULES:
1. PRODUCT COLOR MUST remain exactly "${productDetails?.color || 'as shown in source image'}".
2. PRODUCT DESIGN details (logos, prints, patterns, stitch lines, buttons, zippers) must remain identical.
3. FACE/BODY identity must remain unchanged (same person and natural proportions).
4. Product fit must look realistic and naturally worn.
5. Product must be clearly visible in output.
${extra ? `6. EXTRA RULE: ${extra}` : ''}`.trim();

// Agent 1: Product Analyzer
export const analyzeProduct = async (productImagePath, productDetails) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getTextModelName() });
  
  const imageData = await fileToBase64(productImagePath);
  const mimeType = getMimeType(productImagePath);

  const prompt = `You are a professional fashion/product photography expert.

Analyze this product image and details:
- Product: ${productDetails.name}
- Category: ${productDetails.category}
- Color: ${productDetails.color || 'as shown'}
- Material: ${productDetails.material || 'unknown'}

Provide analysis in JSON format:
{
  "product_type": "clothing|accessory|footwear|other",
  "detected_category": "shirt|tshirt|jeans|watch|perfume|cap|bag|shoes|other",
  "needs_model": true/false,
  "recommended_angles": ["front", "back", "left_side", "right_side", "3_4_front", "detail_close"],
  "flipkart_angles": ["front", "back", "left_side", "right_side"],
  "amazon_angles": ["front", "back", "left_side", "3_4_front", "detail_close"],
  "styling_notes": "brief styling suggestion",
  "background_recommendation": "white|lifestyle|gradient|studio"
}

Return ONLY valid JSON, no markdown.`;

  let result;
  try {
    result = await model.generateContent([
      { inlineData: { data: imageData, mimeType } },
      prompt
    ]);
  } catch (error) {
    throw normalizeGeminiError(error);
  }
  
  try {
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return {
      product_type: 'clothing',
      needs_model: true,
      recommended_angles: ['front', 'back', 'left_side', 'right_side'],
      flipkart_angles: ['front', 'back', 'left_side', 'right_side'],
      amazon_angles: ['front', 'back', 'left_side', '3_4_front', 'detail_close'],
      background_recommendation: 'white'
    };
  }
};

// Agent 2: Try-On Generator (model wearing product)
export const generateTryOn = async (modelImagePath, productImagePath, productDetails, angle = 'front', options = {}) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const modelImageData = await fileToBase64(modelImagePath);
  const productImageData = await fileToBase64(productImagePath);
  const modelMime = getMimeType(modelImagePath);
  const productMime = getMimeType(productImagePath);

  const variantSeed = Number.isFinite(Number(options?.poseVariant))
    ? Number(options.poseVariant)
    : Math.floor(Math.random() * 5);
  const pose = String(options?.customPose || getPose(angle, variantSeed));
  const background = String(options?.customBackground || getBG(variantSeed));
  const strictRulesExtra = String(options?.customRules || getAdminPrompt('strict_rules_extra') || '').trim();
  const extraInstructions = [getAdminPrompt('tryon_extra'), String(options?.customPromptExtra || '').trim()]
    .filter(Boolean)
    .join(' ');

  const prompt = `You are an expert AI fashion photographer. Create a photorealistic product try-on image.

${buildStrictRules(productDetails, strictRulesExtra)}

POSE: ${pose}
ANGLE TARGET: ${angle}
BACKGROUND: ${background}
LIGHTING: Professional studio lighting, balanced exposure, sharp focus.

Product details:
- Name: ${productDetails?.name || 'Product'}
- Category: ${productDetails?.category || 'clothing'}
- Color: ${productDetails?.color || 'as shown'}
- Material: ${productDetails?.material || 'as shown'}
- Description: ${productDetails?.description || ''}

${extraInstructions ? `ADDITIONAL REQUIREMENTS: ${extraInstructions}` : ''}

Generate a high-quality, realistic fashion photography image showing the model wearing this exact product.`;

  let result;
  try {
    result = await model.generateContent([
      { inlineData: { data: modelImageData, mimeType: modelMime } },
      { inlineData: { data: productImageData, mimeType: productMime } },
      prompt
    ]);
  } catch (error) {
    throw normalizeGeminiError(error);
  }

  const response = result.response;
  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return {
        success: true,
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
        angle,
        pose
      };
    }
  }

  return { success: false, error: 'No image generated' };
};

// Agent 3: Background Generator (no model)
export const generateProductBG = async (productImagePath, productDetails, bgStyle = 'studio', options = {}) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const imageData = await fileToBase64(productImagePath);
  const mimeType = getMimeType(productImagePath);

  const bgPrompts = {
    'studio': 'clean white studio background with soft shadows, professional product photography',
    'lifestyle': 'modern lifestyle background matching the product aesthetic, premium feel',
    'gradient': 'elegant gradient background, luxury product photography',
    'flat_lay': 'flat lay product photography on clean surface with minimal props',
    'premium_quality': 'clean white background with elegant "Premium Quality" gold calligraphy and 5 gold stars, premium catalog style'
  };

  const selectedBackground = String(options?.customBGDescription || bgPrompts[bgStyle] || bgPrompts.studio);
  const strictRulesExtra = String(options?.customRules || getAdminPrompt('strict_rules_extra') || '').trim();
  const adminExtra = getAdminPrompt('bg_extra');
  const customExtra = String(options?.customPromptExtra || '').trim();

  const prompt = `Professional product photographer. Create a stunning product image.

Product: ${productDetails.name}
Category: ${productDetails.category}
Color: ${productDetails.color || 'as shown'}

${buildStrictRules(productDetails, strictRulesExtra)}

Requirements:
1. Keep the product EXACTLY as shown - same color, design, shape, all details preserved
2. Background: ${selectedBackground}
3. Professional lighting that highlights product features
4. High resolution, sharp, e-commerce ready
5. Product centered and properly displayed
${adminExtra ? `Admin extra: ${adminExtra}` : ''}
${customExtra ? `Extra: ${customExtra}` : ''}

Generate a professional e-commerce product photo.`;

  let result;
  try {
    result = await model.generateContent([
      { inlineData: { data: imageData, mimeType } },
      prompt
    ]);
  } catch (error) {
    throw normalizeGeminiError(error);
  }

  const response = result.response;
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        success: true,
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType
      };
    }
  }

  return { success: false, error: 'No image generated' };
};

// Agent 4: Customer Try-On
export const generateCustomerTryOn = async (customerImagePath, productImagePath, productDetails, options = {}) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const customerData = await fileToBase64(customerImagePath);
  const productData = await fileToBase64(productImagePath);
  const customerMime = getMimeType(customerImagePath);
  const productMime = getMimeType(productImagePath);

  const results = [];
  const angles = ['front', '3_4_front'];

  for (const [index, angle] of angles.entries()) {
    const pose = getPose(angle, index);
    const extraInstructions = [getAdminPrompt('tryon_extra'), String(options?.customPromptExtra || '').trim()]
      .filter(Boolean)
      .join(' ');
    const prompt = `Virtual try-on specialist. Show this customer wearing this product.

CRITICAL:
1. Customer's face: PRESERVE EXACTLY - every feature, skin tone, expression
2. Product: Apply EXACTLY as shown - same color, design, pattern, texture
3. Make it look completely natural and realistic
4. ${angle === 'front' ? 'Front facing view' : '3/4 angle view'}
5. Pose guidance: ${pose}
5. Professional lighting, clean background
6. The fit should look natural on the customer's body type
${extraInstructions ? `7. Additional instructions: ${extraInstructions}` : ''}

This is for a virtual try-on feature for a clothing store.`;

    try {
      const result = await model.generateContent([
        { inlineData: { data: customerData, mimeType: customerMime } },
        { inlineData: { data: productData, mimeType: productMime } },
        prompt
      ]);

      const response = result.response;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          results.push({
            angle,
            imageData: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          });
        }
      }
    } catch (error) {
      const err = normalizeGeminiError(error);
      console.error(`Error generating ${angle}:`, err.message);
      if (['GEMINI_QUOTA_EXCEEDED', 'GEMINI_KEY_INVALID', 'GEMINI_KEY_MISSING', 'GEMINI_MODEL_UNAVAILABLE'].includes(err.code)) {
        throw err;
      }
    }
  }

  return results;
};

// Agent 5: Amazon/Flipkart Content Generator
export const generateProductContent = async (productDetails, platform = 'amazon') => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getTextModelName() });

  const platformSpecs = {
    amazon: {
      titleLength: '150 chars max',
      bulletPoints: '5 bullet points, start with capital letters',
      description: '2000 chars max',
      keywords: '250 bytes max backend keywords'
    },
    flipkart: {
      titleLength: '100 chars max',
      bulletPoints: '5 key highlights',
      description: '1000 chars max',
      keywords: 'relevant search terms'
    }
  };

  const specs = platformSpecs[platform] || platformSpecs.amazon;

  const prompt = `You are an expert ${platform} product listing specialist. Create compelling product content.

Product Details:
- Name: ${productDetails.name}
- Category: ${productDetails.category}
- Color: ${productDetails.color || 'N/A'}
- Material: ${productDetails.material || 'N/A'}
- Size Range: ${productDetails.size_range || 'N/A'}
- Brand: ${productDetails.brand || 'N/A'}
- Price Range: ₹${productDetails.price || 'N/A'}
- Additional Details: ${productDetails.description || 'N/A'}

Platform: ${platform.toUpperCase()}
Specs: ${JSON.stringify(specs)}

Generate complete listing content in JSON format:
{
  "title": "SEO-optimized product title",
  "description": "Engaging product description",
  "bullet_points": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4", "Benefit 5"],
  "keywords": ["keyword1", "keyword2", ...],
  "category_path": "Category > Subcategory > Sub-subcategory",
  "search_terms": "comma separated search terms",
  "size_chart_note": "size guidance",
  "care_instructions": "care and maintenance",
  "in_the_box": ["item1", "item2"]
}

Return ONLY valid JSON.`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (error) {
    throw normalizeGeminiError(error);
  }
  
  try {
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    const err = new Error('Vertex listing response was not valid JSON.');
    err.code = 'GEMINI_BAD_RESPONSE_FORMAT';
    throw err;
  }
};

const view360AngleInstructions = {
  front: 'front-facing view with the product centered',
  left_side: 'left-side profile view with natural perspective',
  back: 'back view showing rear details',
  right_side: 'right-side profile view with natural perspective'
};

export const generate360View = async (productImagePath, modelImagePath, productDetails, options = {}) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const productData = await fileToBase64(productImagePath);
  const productMime = getMimeType(productImagePath);
  const modelData = modelImagePath ? await fileToBase64(modelImagePath) : null;
  const modelMime = modelImagePath ? getMimeType(modelImagePath) : null;

  const angles = ['front', 'left_side', 'back', 'right_side'];
  const results = [];

  for (const [index, angle] of angles.entries()) {
    const pose = getPose(angle, index);
    const customExtra = String(options?.customPromptExtra || '').trim();
    const prompt = `Professional 360 product photography.

CRITICAL REQUIREMENTS:
1. Product color must remain EXACTLY identical to source image.
2. Product design/details must remain EXACTLY identical.
3. Keep lighting and background consistent across all angles.
4. Output only differs by camera angle.
5. Background: clean white or light gray studio.

Product: ${productDetails?.name || 'Product'}
Category: ${productDetails?.category || 'item'}
Color: ${productDetails?.color || 'as shown'}

Angle instruction: ${view360AngleInstructions[angle] || view360AngleInstructions.front}
Pose guidance: ${pose}
${customExtra ? `Extra instructions: ${customExtra}` : ''}

Generate one high-quality e-commerce image for this specific angle.`;

    const contentParts = [{ inlineData: { data: productData, mimeType: productMime } }];
    if (modelData && modelMime) contentParts.unshift({ inlineData: { data: modelData, mimeType: modelMime } });
    contentParts.push(prompt);

    try {
      const response = await model.generateContent(contentParts);
      const parts = response?.response?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part) => part.inlineData?.data);
      if (imagePart?.inlineData?.data) {
        results.push({
          angle,
          imageData: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType || 'image/jpeg'
        });
      }
    } catch (error) {
      const err = normalizeGeminiError(error);
      if (['GEMINI_QUOTA_EXCEEDED', 'GEMINI_KEY_INVALID', 'GEMINI_KEY_MISSING', 'GEMINI_MODEL_UNAVAILABLE'].includes(err.code)) {
        throw err;
      }
    }
  }

  return results;
};

export const generateVideoScript = async (productDetails, videoType = 'showcase', options = {}) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getTextModelName() });

  const adminVideoPrompt = getAdminPrompt('video_extra');
  const customVideoPrompt = String(options?.customVideoPrompt || '').trim();

  const typePrompt = {
    showcase: 'premium product showcase',
    how_to_use: 'instructional how-to-use clip',
    how_to_assemble: 'assembly tutorial clip',
    size_ratio: 'size comparison clip',
    lifestyle: 'lifestyle fashion clip',
    sample_demo: 'quick social media demo clip'
  };

  const prompt = `Create an 8-second video concept JSON for e-commerce/social media.

Product:
- Name: ${productDetails?.name || 'Product'}
- Category: ${productDetails?.category || 'item'}
- Color: ${productDetails?.color || 'as shown'}
- Description: ${productDetails?.description || 'N/A'}

Video type: ${typePrompt[videoType] || typePrompt.showcase}
${adminVideoPrompt ? `Admin style note: ${adminVideoPrompt}` : ''}
${customVideoPrompt ? `Custom style note: ${customVideoPrompt}` : ''}

Return ONLY valid JSON in this schema:
{
  "video_type": "${videoType}",
  "duration": "8 seconds",
  "scenes": [
    {"second":"0-2","shot":"...","action":"...","text_overlay":"..."},
    {"second":"2-4","shot":"...","action":"...","text_overlay":"..."},
    {"second":"4-6","shot":"...","action":"...","text_overlay":"..."},
    {"second":"6-8","shot":"...","action":"...","text_overlay":"..."}
  ],
  "motion_prompt": "single detailed prompt suitable for Luma/Runway/Kling",
  "style_notes": "visual style guidance",
  "color_note": "must preserve product color exactly"
}`;

  try {
    const response = await model.generateContent(prompt);
    const text = response.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return {
      video_type: videoType,
      duration: '8 seconds',
      scenes: [],
      motion_prompt: `Showcase ${productDetails?.name || 'product'} with smooth camera movement and premium lighting.`,
      style_notes: 'Clean professional style',
      color_note: `Preserve ${productDetails?.color || 'original'} color exactly.`
    };
  }
};

export const generateProductLabel = async (productImagePath, config) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const imageData = await fileToBase64(productImagePath);
  const mimeType = getMimeType(productImagePath);

  const prompt = `You are a premium product label designer.

Create a professional product label/tag design and apply it naturally to the product image.

Brand: ${config?.brand_name || 'Brand'}
Product: ${config?.product_name || 'Product'}
Tagline: ${config?.tagline || ''}
Style: ${config?.style || 'modern_minimal'}
Colors: ${config?.colors || 'match product'}
Label size: ${config?.label_size || 'standard hang tag'}
Include elements: ${Array.isArray(config?.include_elements) ? config.include_elements.join(', ') : String(config?.include_elements || 'brand name, product name')}

Requirements:
1. Keep product color and design unchanged.
2. Label should be readable and visually balanced.
3. Output should look like real product photography.
4. Professional, high-resolution result.`;

  try {
    const response = await model.generateContent([
      { inlineData: { data: imageData, mimeType } },
      prompt
    ]);

    const parts = response?.response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    if (!imagePart?.inlineData?.data) return { success: false, error: 'No image generated' };

    return {
      success: true,
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/jpeg'
    };
  } catch (error) {
    throw normalizeGeminiError(error);
  }
};

export const generateAIPrompt = async (productImagePath, productDetails, promptType = 'tryon') => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getTextModelName() });

  const imageData = await fileToBase64(productImagePath);
  const mimeType = getMimeType(productImagePath);

  const typeMap = {
    tryon: 'fashion try-on e-commerce photography prompt',
    scene: 'product scene composition and background placement prompt',
    marketing: 'marketing poster/ad visual creation prompt',
    video: 'product video script and motion prompt for AI video generators'
  };

  const prompt = `You are an AI photography prompt engineer.

Analyze this product and generate ${typeMap[promptType] || typeMap.tryon}.

Product:
- Name: ${productDetails?.name || 'Product'}
- Category: ${productDetails?.category || 'clothing'}
- Color: ${productDetails?.color || 'as shown'}
- Description: ${productDetails?.description || ''}

Return ONLY valid JSON:
{
  "main_prompt": "complete detailed ready-to-use prompt",
  "color_note": "color preservation instruction",
  "pose_suggestions": ["pose1", "pose2", "pose3"],
  "background_suggestions": ["bg1", "bg2", "bg3"],
  "style_tips": "styling advice",
  "platform_specific": {
    "flipkart": "tip",
    "amazon": "tip",
    "instagram": "tip"
  }
}`;

  try {
    const response = await model.generateContent([
      { inlineData: { data: imageData, mimeType } },
      prompt
    ]);
    const text = response.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return {
      main_prompt: `Professional ${productDetails?.category || 'product'} photography with exact color preservation and clean studio background.`,
      color_note: `Keep ${productDetails?.color || 'original'} color identical to source image.`,
      pose_suggestions: ['Front facing', 'Side profile', '3/4 angle'],
      background_suggestions: ['White studio', 'Lifestyle setup', 'Premium gradient'],
      style_tips: 'Keep product fully visible with sharp details.',
      platform_specific: {
        flipkart: 'Use clean white listing background.',
        amazon: 'Prioritize front-facing hero image with clear details.',
        instagram: 'Use lifestyle framing and dynamic composition.'
      }
    };
  }
};

export const measureProductSize = async (productImagePath, productDetails) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getTextModelName() });

  const imageData = await fileToBase64(productImagePath);
  const mimeType = getMimeType(productImagePath);

  const prompt = `Estimate product measurements from image context and return ONLY valid JSON:
{
  "product_type": "${productDetails?.category || 'product'}",
  "estimated_dimensions": {
    "length": "...",
    "width": "...",
    "height_or_depth": "..."
  },
  "size_category": "XS|S|M|L|XL|XXL",
  "size_range": "S-3XL etc",
  "body_fit_guide": "how it fits",
  "measurement_points": ["chest","waist","length"],
  "size_chart_tip": "buying guidance",
  "scale_reference": "similar real-world object"
}`;

  try {
    const response = await model.generateContent([
      { inlineData: { data: imageData, mimeType } },
      prompt
    ]);
    const text = response.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return {
      product_type: productDetails?.category || 'product',
      estimated_dimensions: {},
      size_category: 'M',
      size_range: 'S-3XL',
      body_fit_guide: '',
      measurement_points: [],
      size_chart_tip: '',
      scale_reference: ''
    };
  }
};

// Image Upscaler using Sharp
export const upscaleImage = async (imageBuffer, targetWidth = 2400) => {
  const sharp = (await import('sharp')).default;
  
  const upscaled = await sharp(imageBuffer)
    .resize(targetWidth, null, { 
      withoutEnlargement: false,
      kernel: 'lanczos3'
    })
    .sharpen({ sigma: 1.5 })
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer();
  
  return upscaled;
};
