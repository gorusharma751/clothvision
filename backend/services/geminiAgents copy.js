import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const envVal = (n, f='') => String(process.env[n] ?? f).trim();
const getApiKey = () => envVal('GEMINI_API_KEY') || envVal('GOOGLE_API_KEY');
const getTextModel = () => envVal('GEMINI_TEXT_MODEL', 'gemini-1.5-flash');
const getImageModel = () => envVal('GEMINI_IMAGE_MODEL', 'gemini-2.0-flash-preview-image-generation');

const getClient = () => {
  const key = getApiKey();
  if (!key || key.includes('replace') || key.includes('your_')) throw Object.assign(new Error('Missing or invalid GEMINI_API_KEY'), {code:'GEMINI_KEY_MISSING'});
  return new GoogleGenerativeAI(key);
};

const normalizeErr = (e) => {
  const raw = e?.message || String(e);
  if (/API_KEY_INVALID|not valid|invalid api key/i.test(raw)) return Object.assign(new Error('Gemini API key invalid.'), {code:'GEMINI_KEY_INVALID'});
  if (/429|Quota exceeded|rate-limits/i.test(raw)) return Object.assign(new Error('Gemini quota exceeded.'), {code:'GEMINI_QUOTA_EXCEEDED'});
  if (/404|not found for API version|not supported for generateContent/i.test(raw)) return Object.assign(new Error('Gemini model unavailable. Check GEMINI_IMAGE_MODEL env var.'), {code:'GEMINI_MODEL_UNAVAILABLE'});
  if (/403|PERMISSION_DENIED|billing/i.test(raw)) return Object.assign(new Error('Gemini API not permitted. Enable billing.'), {code:'GEMINI_PERMISSION_DENIED'});
  return Object.assign(new Error(`Gemini failed: ${raw}`), {code:'GEMINI_REQUEST_FAILED'});
};

const b64 = (p) => fs.readFileSync(p).toString('base64');
const mime = (p) => ({'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'}[path.extname(p).toLowerCase()]||'image/jpeg');

const ANGLE_MAP = {
  front:'facing directly forward, full body visible, confident standing pose, feet visible',
  back:'turned completely showing full back view, full body',
  left_side:'90 degrees left side profile, full body',
  right_side:'90 degrees right side profile, full body',
  '3_4':'45-degree front-left angle, showing depth and dimension',
  walking:'natural walking pose, mid-stride, dynamic movement',
  closeup:'upper body close-up, sharp focus on fabric/texture/details',
  sitting:'sitting pose, product fully visible',
};

const STRICT = (d) => `
ABSOLUTE RULES — ANY VIOLATION = FAILURE:
1. PRODUCT COLOR: "${d.color||'EXACT color as shown in product image'}". Output MUST match exactly. No shift, no cast.
2. PRODUCT DESIGN: Every logo, print, pattern, stitch, button, zipper — IDENTICAL to product image.
3. FACE: 100% identical — same features, skin tone, eyes, nose, lips. NO change.
4. BODY: Model shape, height, skin tone — EXACTLY same across all images.
5. FIT: Product must fit naturally on body — correct proportions.`;

export const analyzeProduct = async (imgPath, d) => {
  const model = getClient().getGenerativeModel({model:getTextModel()});
  const prompt = `Analyze product image. ONLY valid JSON, no markdown.
Product: ${d.name}, Category: ${d.category}, Color: ${d.color||'detect'}
Return: {"product_type":"clothing|accessory|footwear|other","detected_color":"exact color","detected_category":"shirt|tshirt|jeans|watch|perfume|cap|bag|shoes|other","needs_model":true,"recommended_angles":["front","back","left_side","right_side","3_4","closeup"],"flipkart_angles":["front","back","left_side","right_side"],"amazon_angles":["front","back","left_side","3_4","closeup"],"styling_notes":"brief tip","background_recommendation":"white|lifestyle|gradient|studio","dimensions_estimate":"size description","color_palette":["#hex1","#hex2"]}`;
  try {
    const r = await model.generateContent([{inlineData:{data:b64(imgPath),mimeType:mime(imgPath)}}, prompt]);
    return JSON.parse(r.response.text().replace(/```json|```/g,'').trim());
  } catch(e) {
    if(e.code) throw e;
    return {product_type:'clothing',needs_model:true,recommended_angles:['front','back','left_side','right_side'],flipkart_angles:['front','back','left_side','right_side'],amazon_angles:['front','back','left_side','3_4','closeup'],background_recommendation:'white',detected_color:d.color||'as shown'};
  }
};

export const generateTryOn = async (modelPath, productPath, d, angle='front') => {
  const model = getClient().getGenerativeModel({model:getImageModel(),generationConfig:{responseModalities:['Text','Image']}});
  const prompt = `Professional fashion photographer. ${angle} view try-on.
${STRICT(d)}
ANGLE: ${ANGLE_MAP[angle]||ANGLE_MAP.front}
BACKGROUND: Clean white/light gray studio, professional lighting
Product: "${d.name}", Color: "${d.color||'EXACT same as product image'}", Category: ${d.category}
Generate try-on image. Product color in output MUST exactly match product image color.`;
  try {
    const r = await model.generateContent([
      {inlineData:{data:b64(modelPath),mimeType:mime(modelPath)}},
      {inlineData:{data:b64(productPath),mimeType:mime(productPath)}},
      {text:prompt}
    ]);
    for(const p of r.response.candidates[0].content.parts)
      if(p.inlineData) return {success:true,imageData:p.inlineData.data,mimeType:p.inlineData.mimeType,angle};
    return {success:false,error:'No image in response'};
  } catch(e){throw normalizeErr(e);}
};

export const generateProductBG = async (productPath, d, bgStyle='studio') => {
  const model = getClient().getGenerativeModel({model:getImageModel(),generationConfig:{responseModalities:['Text','Image']}});
  const bgMap={
    studio:'clean white studio background, soft drop shadow, professional e-commerce',
    studio_white:'pure white background, product centered, minimal',
    lifestyle:'modern lifestyle setting matching product aesthetic',
    gradient:'elegant smooth gradient, luxury feel',
    flat_lay:'flat lay top-down view, minimal surface',
    outdoor:'natural outdoor setting, soft bokeh',
    color_matched:`complementary color background matching ${d.color||'product color'}`,
  };
  const prompt = `Professional e-commerce photographer.
${STRICT(d)}
Background: ${bgMap[bgStyle]||bgMap.studio}
Product: "${d.name}", Color: "${d.color||'exact as shown'}", Category: ${d.category}
Product MUST be centered. Color MUST be identical to input.`;
  try {
    const r = await model.generateContent([{inlineData:{data:b64(productPath),mimeType:mime(productPath)}},{text:prompt}]);
    for(const p of r.response.candidates[0].content.parts)
      if(p.inlineData) return {success:true,imageData:p.inlineData.data,mimeType:p.inlineData.mimeType};
    return {success:false,error:'No image'};
  } catch(e){throw normalizeErr(e);}
};

export const generateCustomerTryOn = async (customerPath, productPath, d) => {
  const model = getClient().getGenerativeModel({model:getImageModel(),generationConfig:{responseModalities:['Text','Image']}});
  const results=[];
  for(const angle of ['front','3_4']){
    const prompt=`Virtual try-on. Customer wearing product.\n${STRICT(d)}\nAngle: ${ANGLE_MAP[angle]}\nNatural realistic fit.`;
    try {
      const r = await model.generateContent([
        {inlineData:{data:b64(customerPath),mimeType:mime(customerPath)}},
        {inlineData:{data:b64(productPath),mimeType:mime(productPath)}},
        {text:prompt}
      ]);
      for(const p of r.response.candidates[0].content.parts)
        if(p.inlineData){results.push({angle,imageData:p.inlineData.data,mimeType:p.inlineData.mimeType});break;}
    } catch(e){const err=normalizeErr(e);if(['GEMINI_QUOTA_EXCEEDED','GEMINI_KEY_INVALID','GEMINI_KEY_MISSING'].includes(err.code))throw err;}
  }
  return results;
};

export const generateProductContent = async (d, platform='amazon') => {
  const model = getClient().getGenerativeModel({model:getTextModel()});
  const prompt=`Expert ${platform} listing. ONLY valid JSON, no markdown.
Product:${d.name}|Category:${d.category}|Color:${d.color||''}|Material:${d.material||''}|Size:${d.size_range||''}|Brand:${d.brand||''}|Price:₹${d.price||''}|Details:${d.description||''}
Return:{"title":"...","description":"...","bullet_points":["...x5"],"keywords":["..."],"category_path":"Cat>Sub","size_chart_note":"...","care_instructions":"...","in_the_box":["..."]}`;
  try {
    const r = await model.generateContent(prompt);
    return JSON.parse(r.response.text().replace(/```json|```/g,'').trim());
  } catch {return {title:d.name,description:d.description||'',bullet_points:[],keywords:[],category_path:d.category};}
};

export const generate360View = async (productPath, modelPath, d) => {
  const model = getClient().getGenerativeModel({model:getImageModel(),generationConfig:{responseModalities:['Text','Image']}});
  const angles=['front','left_side','back','right_side'];
  const results=[];
  const base = modelPath
    ? [{inlineData:{data:b64(modelPath),mimeType:mime(modelPath)}},{inlineData:{data:b64(productPath),mimeType:mime(productPath)}}]
    : [{inlineData:{data:b64(productPath),mimeType:mime(productPath)}}];
  for(const angle of angles){
    const prompt=`360-degree view: ${angle} angle (1 of 4).
${STRICT(d)}
Angle: ${ANGLE_MAP[angle]}
Background: Pure white. Consistent lighting across ALL 4 angles. Only angle changes.
Product: "${d.name}", Color: "${d.color||'exact as shown'}"`;
    try {
      const r = await model.generateContent([...base,{text:prompt}]);
      for(const p of r.response.candidates[0].content.parts)
        if(p.inlineData){results.push({angle,imageData:p.inlineData.data,mimeType:p.inlineData.mimeType});break;}
    } catch(e){const err=normalizeErr(e);if(err.code!=='GEMINI_REQUEST_FAILED')throw err;console.error(`360 ${angle}:`,err.message);}
  }
  return results;
};

export const generateVideoScript = async (d, videoType='showcase') => {
  const model = getClient().getGenerativeModel({model:getTextModel()});
  const types={showcase:'8-sec product showcase',how_to_use:'8-sec how to use',how_to_assemble:'8-sec assembly guide',size_ratio:'8-sec body size comparison',lifestyle:'8-sec lifestyle/fashion'};
  const prompt=`Video script for: ${types[videoType]||types.showcase}
Product:${d.name}|Category:${d.category}|Color:${d.color||''}|Details:${d.description||''}
ONLY valid JSON:{"video_type":"${videoType}","duration":"8 seconds","scenes":[{"second":"0-2","shot":"...","action":"...","text_overlay":"..."},{"second":"2-4","shot":"...","action":"...","text_overlay":"..."},{"second":"4-6","shot":"...","action":"...","text_overlay":"..."},{"second":"6-8","shot":"...","action":"...","text_overlay":"..."}],"motion_prompt":"detailed AI video generation prompt with motion and camera moves","style_notes":"visual style","color_note":"${d.color||'original'} color must be preserved throughout video"}`;
  try {
    const r = await model.generateContent(prompt);
    return JSON.parse(r.response.text().replace(/```json|```/g,'').trim());
  } catch {return {video_type:videoType,duration:'8 seconds',scenes:[],motion_prompt:`Showcase ${d.name} with smooth camera movement`,style_notes:'Clean professional',color_note:`Preserve ${d.color||'original'} color`};}
};

export const generateProductLabel = async (productPath, cfg) => {
  const model = getClient().getGenerativeModel({model:getImageModel(),generationConfig:{responseModalities:['Text','Image']}});
  const prompt=`Professional label/tag designer. Create and apply label to product.
Brand:"${cfg.brand_name}" | Product:"${cfg.product_name}" | Tagline:"${cfg.tagline||''}"
Style:${cfg.style||'modern minimal'} | Colors:${cfg.colors||'match product'} | Size:${cfg.label_size||'standard hang tag'}
Include:${cfg.include_elements?.join(', ')||'brand name, product name, care symbols'}
Design professional print-ready label. Apply naturally to product — realistic placement and perspective.`;
  try {
    const r = await model.generateContent([{inlineData:{data:b64(productPath),mimeType:mime(productPath)}},{text:prompt}]);
    for(const p of r.response.candidates[0].content.parts)
      if(p.inlineData) return {success:true,imageData:p.inlineData.data,mimeType:p.inlineData.mimeType};
    return {success:false,error:'No label generated'};
  } catch(e){throw normalizeErr(e);}
};

export const analyzeSceneCompatibility = async (productPath, bgPath, d) => {
  const model = getClient().getGenerativeModel({model:getTextModel()});
  const parts=[{inlineData:{data:b64(productPath),mimeType:mime(productPath)}}];
  if(bgPath) parts.push({inlineData:{data:b64(bgPath),mimeType:mime(bgPath)}});
  const prompt=`Product photographer and scene designer. Analyze product${bgPath?' and background':''}.
ONLY valid JSON:{"product_type":"what it is","product_color":"exact color","product_size_estimate":"small|medium|large","recommended_placement":"exact placement","compatible_surfaces":["..."],"incompatible_surfaces":["..."],"best_props":["prop1","prop2","prop3"],"avoid_props":["..."],"ideal_lighting":"...","scene_tips":"specific tips","placement_position":"left|center|right","scale_recommendation":"how big in frame","needs_stand":true/false,"needs_plant":true/false,"environment_match":"indoor|outdoor|both"}`;
  try {
    const r = await model.generateContent([...parts,prompt]);
    return JSON.parse(r.response.text().replace(/```json|```/g,'').trim());
  } catch {return {product_color:d.color||'unknown',recommended_placement:'center',best_props:[],ideal_lighting:'soft_natural',scene_tips:'',needs_stand:false};}
};

export const measureProductSize = async (productPath, d) => {
  const model = getClient().getGenerativeModel({model:getTextModel()});
  const prompt=`Estimate dimensions from product image. ONLY valid JSON:
{"product_type":"${d.category}","estimated_dimensions":{"length":"...","width":"...","height_or_depth":"..."},"size_category":"XS|S|M|L|XL|XXL","size_range":"S-3XL etc","body_fit_guide":"how it fits","measurement_points":["chest","waist","length"],"size_chart_tip":"buying advice","scale_reference":"similar to common object"}`;
  try {
    const r = await model.generateContent([{inlineData:{data:b64(productPath),mimeType:mime(productPath)}},prompt]);
    return JSON.parse(r.response.text().replace(/```json|```/g,'').trim());
  } catch {return {estimated_dimensions:{},size_category:'M',size_range:'S-3XL',body_fit_guide:'',measurement_points:[]};}
};

export const upscaleImage = async (buf, w=2400) => {
  const sharp=(await import('sharp')).default;
  return sharp(buf).resize(w,null,{withoutEnlargement:false,kernel:'lanczos3'}).sharpen({sigma:1.5}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toBuffer();
};
