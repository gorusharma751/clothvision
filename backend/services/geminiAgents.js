import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const isRemoteUrl = (value = '') => /^https?:\/\//i.test(String(value));

const envVal = (name, fallback = '') => String(process.env[name] ?? fallback).trim();

const getApiKey = () => envVal('GEMINI_API_KEY') || envVal('GOOGLE_API_KEY');
const getTextModelName = () => envVal('GEMINI_TEXT_MODEL', 'gemini-2.5-flash-lite');
const getImageModelName = () => envVal('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image');

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('Missing Gemini API key. Set GEMINI_API_KEY (or GOOGLE_API_KEY).');
    err.code = 'GEMINI_KEY_MISSING';
    throw err;
  }
  return new GoogleGenerativeAI(apiKey);
};

const normalizeGeminiError = (error) => {
  const raw = error?.message || String(error || 'Gemini request failed');

  if (/API_KEY_INVALID|API key not valid|Please pass a valid API key|invalid api key/i.test(raw)) {
    const err = new Error('Gemini API key is invalid. Use a valid key from Google AI Studio.');
    err.code = 'GEMINI_KEY_INVALID';
    return err;
  }

  if (/429 Too Many Requests|Quota exceeded|rate-limits|limit:\s*0/i.test(raw)) {
    const err = new Error('Gemini quota exceeded. Enable billing or use a project with active quota, then retry.');
    err.code = 'GEMINI_QUOTA_EXCEEDED';
    return err;
  }

  if (/404 Not Found|is not found for API version|not supported for generateContent/i.test(raw)) {
    const err = new Error('Configured Gemini model is unavailable for this API key. Update GEMINI_TEXT_MODEL/GEMINI_IMAGE_MODEL.');
    err.code = 'GEMINI_MODEL_UNAVAILABLE';
    return err;
  }

  if (/403 Forbidden|PERMISSION_DENIED|has not been used in project|billing account|SERVICE_DISABLED/i.test(raw)) {
    const err = new Error('Gemini API is not permitted for this project/key. Enable Generative Language API and billing, then retry.');
    err.code = 'GEMINI_PERMISSION_DENIED';
    return err;
  }

  if (/400 Bad Request/i.test(raw)) {
    const err = new Error(`Gemini request rejected (400). Check model/input format and API restrictions. Raw: ${raw}`);
    err.code = 'GEMINI_BAD_REQUEST';
    return err;
  }

  const err = new Error(`Gemini request failed: ${raw}`);
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
    return {
      title: productDetails.name,
      description: productDetails.description || '',
      bullet_points: [],
      keywords: [],
      category_path: productDetails.category
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
