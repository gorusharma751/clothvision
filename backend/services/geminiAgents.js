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
export const generateTryOn = async (modelImagePath, productImagePath, productDetails, angle = 'front') => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const modelImageData = await fileToBase64(modelImagePath);
  const productImageData = await fileToBase64(productImagePath);
  const modelMime = getMimeType(modelImagePath);
  const productMime = getMimeType(productImagePath);

  const angleInstructions = {
    'front': 'The model is facing directly forward, full body visible, confident pose',
    'back': 'The model is turned showing the back view completely',
    'left_side': 'The model is turned 90 degrees showing left side profile',
    'right_side': 'The model is turned 90 degrees showing right side profile',
    '3_4_front': 'The model is at a 45-degree angle showing front-left view',
    '3_4_back': 'The model is at a 45-degree angle showing back-right view',
    'detail_close': 'Close-up view focusing on the product details and texture'
  };

  const prompt = `You are an expert AI fashion photographer. Create a photorealistic product try-on image.

CRITICAL REQUIREMENTS:
1. FACE PRESERVATION: The model's face must remain 100% identical - same facial features, skin tone, eye shape, nose, lips, jawline. DO NOT alter the face in any way.
2. PRODUCT ACCURACY: The ${productDetails.name} (${productDetails.color || ''} ${productDetails.category}) must look exactly like in the product image - same color, pattern, design, print.
3. POSE: ${angleInstructions[angle] || angleInstructions['front']}
4. QUALITY: Professional studio photography, sharp, high resolution, proper lighting
5. BACKGROUND: Clean white/light gray studio background
6. The product should fit naturally on the model's body

Product details: ${productDetails.name}, ${productDetails.color || ''}, ${productDetails.material || ''}, ${productDetails.description || ''}

Generate a high-quality, realistic fashion photography image showing the model wearing this exact product from the ${angle} angle.`;

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
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        success: true,
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
        angle
      };
    }
  }

  return { success: false, error: 'No image generated' };
};

// Agent 3: Background Generator (no model)
export const generateProductBG = async (productImagePath, productDetails, bgStyle = 'studio') => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const imageData = await fileToBase64(productImagePath);
  const mimeType = getMimeType(productImagePath);

  const bgPrompts = {
    'studio': 'clean white studio background with soft shadows, professional product photography',
    'lifestyle': 'modern lifestyle background matching the product aesthetic, premium feel',
    'gradient': 'elegant gradient background, luxury product photography',
    'flat_lay': 'flat lay product photography on clean surface with minimal props'
  };

  const prompt = `Professional product photographer. Create a stunning product image.

Product: ${productDetails.name}
Category: ${productDetails.category}
Color: ${productDetails.color || 'as shown'}

Requirements:
1. Keep the product EXACTLY as shown - same color, design, shape, all details preserved
2. Background: ${bgPrompts[bgStyle] || bgPrompts['studio']}
3. Professional lighting that highlights product features
4. High resolution, sharp, e-commerce ready
5. Product centered and properly displayed

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
export const generateCustomerTryOn = async (customerImagePath, productImagePath, productDetails) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const customerData = await fileToBase64(customerImagePath);
  const productData = await fileToBase64(productImagePath);
  const customerMime = getMimeType(customerImagePath);
  const productMime = getMimeType(productImagePath);

  const results = [];
  const angles = ['front', '3_4_front'];

  for (const angle of angles) {
    const prompt = `Virtual try-on specialist. Show this customer wearing this product.

CRITICAL:
1. Customer's face: PRESERVE EXACTLY - every feature, skin tone, expression
2. Product: Apply EXACTLY as shown - same color, design, pattern, texture
3. Make it look completely natural and realistic
4. ${angle === 'front' ? 'Front facing view' : '3/4 angle view'}
5. Professional lighting, clean background
6. The fit should look natural on the customer's body type

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

export const generate360View = async (productImagePath, modelImagePath, productDetails) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getImageModelName() });

  const productData = await fileToBase64(productImagePath);
  const productMime = getMimeType(productImagePath);
  const modelData = modelImagePath ? await fileToBase64(modelImagePath) : null;
  const modelMime = modelImagePath ? getMimeType(modelImagePath) : null;

  const angles = ['front', 'left_side', 'back', 'right_side'];
  const results = [];

  for (const angle of angles) {
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

export const generateVideoScript = async (productDetails, videoType = 'showcase') => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: getTextModelName() });

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
