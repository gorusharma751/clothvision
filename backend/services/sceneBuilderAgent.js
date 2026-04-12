import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const envVal = (name, fallback = '') => String(process.env[name] ?? fallback).trim();

const isPlaceholderValue = (value = '') => {
  const v = String(value || '').trim();
  if (!v) return true;
  const patterns = [/^replace_with_/i, /^your[_-]?/i, /^example/i, /your_key/i, /api[_-]?key[_-]?here/i];
  return patterns.some((re) => re.test(v));
};

const getClient = () => {
  const candidates = [envVal('GEMINI_API_KEY'), envVal('GOOGLE_API_KEY')];
  const key = candidates.find((candidate) => !isPlaceholderValue(candidate));
  if (!key) throw new Error('Missing GEMINI_API_KEY');
  return new GoogleGenerativeAI(key);
};

const fileToBase64 = (p) => fs.readFileSync(p).toString('base64');
const getMime = (p) => ({'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'}[path.extname(p).toLowerCase()] || 'image/jpeg');

const LIGHTING_MAP = {
  soft_natural: 'soft natural daylight, gentle shadows, warm tones',
  studio_white: 'professional studio white lighting, clean bright, minimal shadows',
  golden_hour: 'warm golden hour sunlight, long soft shadows',
  dramatic: 'dramatic side lighting, strong contrast, moody atmosphere',
  flat: 'flat even lighting, no harsh shadows, e-commerce style',
};

const SURFACE_MAP = {
  table: 'placed on a clean wooden/marble table surface',
  shelf: 'displayed on a shelf or product rack',
  floor: 'placed on a clean floor or ground',
  car_dashboard: 'placed on a car dashboard, inside vehicle interior',
  car_seat: 'placed on a car seat',
  bed: 'placed on a bed or sofa',
  custom: '',
};

const FORMAT_SIZE = {
  flipkart_square: { ratio: '1:1', desc: 'square format 1000x1000' },
  amazon_rect: { ratio: '4:3', desc: 'landscape 4:3 ratio' },
  instagram: { ratio: '1:1', desc: 'square 1080x1080' },
  story: { ratio: '9:16', desc: 'vertical portrait 9:16' },
  banner: { ratio: '16:9', desc: 'wide landscape banner 16:9' },
};

export const generateProductScene = async (productImagePath, backgroundImagePath, config) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: envVal('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image') });

  const productData = fileToBase64(productImagePath);
  const productMime = getMime(productImagePath);

  const surface = config.surface_type === 'custom'
    ? config.surface_description
    : SURFACE_MAP[config.surface_type] || SURFACE_MAP.table;

  const lighting = LIGHTING_MAP[config.lighting_style] || LIGHTING_MAP.soft_natural;
  const props = config.selected_props?.length
    ? `Decorative props around the product: ${config.selected_props.join(', ')}.`
    : '';
  const shadow = config.show_shadow ? 'Add a realistic soft drop shadow under the product.' : 'Minimal shadow.';
  const format = FORMAT_SIZE[config.output_format] || FORMAT_SIZE.flipkart_square;
  const position = config.product_position === 'left' ? 'left side of frame' : config.product_position === 'right' ? 'right side of frame' : 'center of frame';

  const bgInstruction = backgroundImagePath
    ? `USE THE PROVIDED BACKGROUND IMAGE EXACTLY — keep all background elements, colors, textures, and composition from it. Place the product naturally into this specific background scene.`
    : `Create a beautiful, professional ${config.platform || 'e-commerce'} product background that matches the product's style and color palette.`;

  const prompt = `You are a professional ${config.platform || 'e-commerce'} product photographer and scene composer.

TASK: Create a stunning product scene image for ${config.platform?.toUpperCase() || 'FLIPKART'} listing.

PRODUCT: "${config.product_name}" (${config.product_category})
PRODUCT RULE: Keep the product EXACTLY as shown — same color, design, shape, texture, branding, ALL details preserved 100%. Do NOT alter the product in any way.

SCENE SETUP:
- Surface/Placement: Product is ${surface}
- Product position: ${position}
- Lighting: ${lighting}
- ${shadow}
${props ? `- Props: ${props}` : ''}
${config.surface_description ? `- Additional scene details: ${config.surface_description}` : ''}

BACKGROUND: ${bgInstruction}

OUTPUT FORMAT: ${format.desc}, ${format.ratio} aspect ratio, optimized for ${config.platform || 'Flipkart'} listing.

${config.custom_prompt ? `EXTRA INSTRUCTIONS: ${config.custom_prompt}` : ''}

QUALITY: High resolution, professional product photography, sharp focus on product, ready for e-commerce listing. The product must be the hero of the image.

Generate the product scene image now.`;

  const parts = [
    { inlineData: { data: productData, mimeType: productMime } },
  ];

  if (backgroundImagePath) {
    const bgData = fileToBase64(backgroundImagePath);
    const bgMime = getMime(backgroundImagePath);
    parts.push({ inlineData: { data: bgData, mimeType: bgMime } });
  }

  parts.push({ text: prompt });

  const results = [];

  try {
    const result = await model.generateContent(parts);
    const response = result.response;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        results.push({
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
          format: config.output_format,
          variant: 'main'
        });
        break;
      }
    }
  } catch (err) {
    console.error('Scene generation error:', err.message);
    throw new Error(`Scene generation failed: ${err.message}`);
  }

  return results;
};

// Generate AI prompt suggestion based on product + background
export const generateScenePrompt = async (productDetails, bgDescription) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: envVal('GEMINI_TEXT_MODEL', 'gemini-2.5-flash-lite') });

  const prompt = `You are a product photography expert. Suggest the best scene setup for this product listing.

Product: ${productDetails.name} (${productDetails.category})
Background context: ${bgDescription || 'no background provided'}

Return ONLY valid JSON:
{
  "suggested_surface": "table|shelf|floor|car_dashboard|bed|custom",
  "suggested_props": ["prop1", "prop2"],
  "suggested_lighting": "soft_natural|studio_white|golden_hour|dramatic|flat",
  "scene_description": "brief scene description",
  "custom_prompt": "additional photography instructions",
  "platform_tip": "tip for Flipkart/Amazon listing"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return {
      suggested_surface: 'table',
      suggested_props: ['flowers', 'leaves'],
      suggested_lighting: 'soft_natural',
      scene_description: 'Clean product shot on table',
      custom_prompt: '',
      platform_tip: 'Use white/light background for Flipkart'
    };
  }
};
