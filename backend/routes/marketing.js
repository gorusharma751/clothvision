import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { uploadToCloudinary, isCloudinaryEnabled } from '../services/cloudinaryService.js';
import { getClient, getImageModelName, getTextModelName } from '../services/genaiClient.js';

const router = express.Router();
router.use(authenticate);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.isAbsolute(process.env.UPLOAD_DIR||'./uploads') ? process.env.UPLOAD_DIR : path.resolve(__dirname,'..', process.env.UPLOAD_DIR||'./uploads');
const ensureDir=(uid)=>{const d=path.join(UPLOAD_ROOT,String(uid));fs.mkdirSync(d,{recursive:true});return d;};
const storage=multer.diskStorage({destination:(req,f,cb)=>cb(null,ensureDir(req.user.id)),filename:(req,f,cb)=>cb(null,`${uuidv4()}${path.extname(f.originalname)}`)});
const upload=multer({storage,limits:{fileSize:15*1024*1024}});

const useCredits=async(uid,amt)=>{
  const{rows}=await query('SELECT balance FROM credits WHERE owner_id=$1',[uid]);
  if(!rows.length||rows[0].balance<amt)throw new Error('Insufficient credits');
  await query('UPDATE credits SET balance=balance-$1,total_used=total_used+$1,updated_at=NOW() WHERE owner_id=$2',[amt,uid]);
};

const b64=(p)=>fs.readFileSync(p).toString('base64');
const mime=(p)=>({'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'}[path.extname(p).toLowerCase()]||'image/jpeg');

router.post('/generate-poster', upload.fields([{name:'product_image'},{name:'logo'}]), async(req,res)=>{
  try{
    if(!req.files?.product_image) return res.status(400).json({error:'Product image required'});
    const{rows}=await query('SELECT balance FROM credits WHERE owner_id=$1',[req.user.id]);
    if(!rows.length||rows[0].balance<3) return res.status(402).json({error:'Need 3 credits for poster generation'});

    const {poster_style,poster_size,brand_name,tagline,extra_details,product_name,price,discount_price,call_to_action} = req.body;
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: getImageModelName() });

    const sizeMap={
      instagram_post:'1:1 square format, 1080x1080px equivalent',
      instagram_story:'9:16 vertical portrait format, 1080x1920px',
      facebook_post:'4:3 landscape format',
      flipkart_banner:'16:9 wide banner format',
      whatsapp_status:'9:16 vertical portrait format',
    };

    const styleMap={
      modern_bold:'Bold typography, strong contrast, modern geometric elements',
      minimalist:'Clean white space, minimal elements, elegant typography',
      luxury:'Gold accents, dark premium background, luxury feel',
      colorful_vibrant:'Bright vibrant colors, energetic, social media ready',
      editorial:'Magazine-style editorial layout, sophisticated',
      sale_promo:'Sale badge prominent, price strikethrough, urgency elements',
    };

    const parts=[{inlineData:{data:b64(req.files.product_image[0].path),mimeType:mime(req.files.product_image[0].path)}}];
    if(req.files?.logo) parts.push({inlineData:{data:b64(req.files.logo[0].path),mimeType:mime(req.files.logo[0].path)}});

    const logoInstr = req.files?.logo ? 'Include the provided logo prominently in the poster.' : '';
    const priceSection = price ? (discount_price ? `Original price: ${price}, SALE PRICE: ${discount_price} (show savings)` : `Price: ${price}`) : '';
    const ctaSection = call_to_action || 'Shop Now';

    const prompt = `Professional graphic designer creating a marketing poster.

STYLE: ${styleMap[poster_style]||styleMap.modern_bold}
FORMAT: ${sizeMap[poster_size]||sizeMap.instagram_post}

CONTENT:
- Brand: "${brand_name||'Brand'}"
- Product: "${product_name||'Product'}"
- Tagline: "${tagline||''}"
- ${priceSection}
- CTA Button: "${ctaSection}"
- Extra: "${extra_details||''}"

${logoInstr}

DESIGN RULES:
1. Product image must be prominently featured — EXACT same color and design
2. Typography: clear, readable, professional
3. Composition: balanced, attractive, scroll-stopping
4. The poster must look professional — ready to post on Instagram/Facebook
5. Include all provided text elements tastefully
6. High resolution, print-quality output

Create the marketing poster now.`;

    parts.push({text:prompt});
    const result=await model.generateContent(parts);
    
    let imageData=null, imageMime=null;
    const imageParts = result?.response?.candidates?.[0]?.content?.parts || [];
    for(const p of imageParts){
      if(p.inlineData){imageData=p.inlineData.data;imageMime=p.inlineData.mimeType;break;}
    }

    if(!imageData) return res.status(500).json({error:'Poster generation failed — no image output'});

    await useCredits(req.user.id,3);
    const buf=Buffer.from(imageData,'base64');
    let savedUrl;
    if(isCloudinaryEnabled()){savedUrl=await uploadToCloudinary(buf,{folder:`clothvision/${req.user.id}/posters`});}
    else{const p=path.join(ensureDir(req.user.id),`poster_${uuidv4()}.jpg`).replace(/\\/g,'/');fs.writeFileSync(p,buf);savedUrl=p;}

    // Generate Instagram caption using text model
    let instagramCaption='';
    try{
      const textModel=genAI.getGenerativeModel({ model: getTextModelName() });
      const captionResult=await textModel.generateContent(`Write an engaging Instagram caption for this product post.
Brand: ${brand_name||''} | Product: ${product_name||''} | Tagline: ${tagline||''} | CTA: ${ctaSection}
Include relevant hashtags. Keep it under 150 words. Make it engaging and on-brand.`);
      instagramCaption=captionResult?.response?.text?.() || '';
    }catch(e){console.error('Caption gen failed:',e.message);}

    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',[req.user.id,'use',3,`Marketing poster: ${brand_name||product_name||'poster'}`]);
    // Save to label_generations table for history
    await query('INSERT INTO label_generations (owner_id,product_image,config,result_url,credits_used) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id,req.files.product_image[0].path,JSON.stringify({type:'poster',poster_style,poster_size,brand_name,product_name}),savedUrl,3]);

    res.json({success:true,image_url:savedUrl,instagram_caption:instagramCaption,credits_used:3});
  }catch(err){
    const s=err.message==='Insufficient credits'?402:500;
    res.status(s).json({error:err.message});
  }
});

export default router;
