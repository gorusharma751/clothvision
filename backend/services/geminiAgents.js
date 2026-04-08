import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const getClient = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const fileToBase64 = (filePath) => {
  const data = fs.readFileSync(filePath);
  return data.toString('base64');
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return types[ext] || 'image/jpeg';
};

// Agent 1: Product Analyzer
export const analyzeProduct = async (productImagePath, productDetails) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const imageData = fileToBase64(productImagePath);
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

  const result = await model.generateContent([
    { inlineData: { data: imageData, mimeType } },
    prompt
  ]);
  
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const modelImageData = fileToBase64(modelImagePath);
  const productImageData = fileToBase64(productImagePath);
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

  const result = await model.generateContent([
    { inlineData: { data: modelImageData, mimeType: modelMime } },
    { inlineData: { data: productImageData, mimeType: productMime } },
    prompt
  ]);

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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const imageData = fileToBase64(productImagePath);
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

  const result = await model.generateContent([
    { inlineData: { data: imageData, mimeType } },
    prompt
  ]);

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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const customerData = fileToBase64(customerImagePath);
  const productData = fileToBase64(productImagePath);
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
    } catch (err) {
      console.error(`Error generating ${angle}:`, err.message);
    }
  }

  return results;
};

// Agent 5: Amazon/Flipkart Content Generator
export const generateProductContent = async (productDetails, platform = 'amazon') => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  const result = await model.generateContent(prompt);
  
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
