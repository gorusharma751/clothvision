import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { generateProductLabel } from '../services/geminiAgents.js';
import { uploadToCloudinary, isCloudinaryEnabled } from '../services/cloudinaryService.js';

const router = express.Router();
router.use(authenticate);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.isAbsolute(process.env.UPLOAD_DIR||'./uploads') ? process.env.UPLOAD_DIR : path.resolve(__dirname,'..', process.env.UPLOAD_DIR||'./uploads');
const ensureDir = (uid) => { const d=path.join(UPLOAD_ROOT,String(uid)); fs.mkdirSync(d,{recursive:true}); return d; };
const storage = multer.diskStorage({ destination:(req,f,cb)=>cb(null,ensureDir(req.user.id)), filename:(req,f,cb)=>cb(null,`${uuidv4()}${path.extname(f.originalname)}`) });
const upload = multer({ storage, limits:{fileSize:15*1024*1024} });

const useCredits = async (uid, amt) => {
  const {rows} = await query('SELECT balance FROM credits WHERE owner_id=$1',[uid]);
  if(!rows.length||rows[0].balance<amt) throw new Error('Insufficient credits');
  await query('UPDATE credits SET balance=balance-$1,total_used=total_used+$1,updated_at=NOW() WHERE owner_id=$2',[amt,uid]);
};

const LABEL_STYLES = [
  {id:'modern_minimal', label:'Modern Minimal', desc:'Clean white, elegant typography'},
  {id:'luxury_gold', label:'Luxury Gold', desc:'Gold accents, premium feel'},
  {id:'bold_colorful', label:'Bold & Colorful', desc:'Vibrant, eye-catching'},
  {id:'classic_vintage', label:'Classic Vintage', desc:'Retro charm, serif fonts'},
  {id:'eco_natural', label:'Eco Natural', desc:'Kraft paper, organic feel'},
  {id:'sportswear', label:'Sportswear', desc:'Bold, athletic, dynamic'},
];

router.get('/styles', (req, res) => res.json(LABEL_STYLES));

router.post('/generate', upload.single('product_image'), async (req, res) => {
  try {
    if(!req.file) return res.status(400).json({error:'Product image required'});
    const {rows} = await query('SELECT balance FROM credits WHERE owner_id=$1',[req.user.id]);
    if(!rows.length||rows[0].balance<2) return res.status(402).json({error:'Need 2 credits for label generation'});

    const cfg = {
      brand_name: req.body.brand_name || 'My Brand',
      product_name: req.body.product_name || 'Product',
      tagline: req.body.tagline || '',
      style: req.body.style || 'modern_minimal',
      colors: req.body.colors || 'match product',
      label_size: req.body.label_size || 'standard hang tag',
      include_elements: JSON.parse(req.body.include_elements || '["brand name","product name","care symbols","barcode","size"]'),
    };

    const result = await generateProductLabel(req.file.path, cfg);
    if(!result.success) return res.status(500).json({error:'Label generation failed'});

    await useCredits(req.user.id, 2);
    const buf = Buffer.from(result.imageData,'base64');
    let savedUrl;
    if(isCloudinaryEnabled()){
      savedUrl = await uploadToCloudinary(buf,{folder:`clothvision/${req.user.id}/labels`});
    } else {
      savedUrl = path.join(ensureDir(req.user.id),`label_${uuidv4()}.jpg`).replace(/\\/g,'/');
      fs.writeFileSync(savedUrl,buf);
    }

    await query('INSERT INTO credit_transactions (owner_id,type,amount,description) VALUES ($1,$2,$3,$4)',[req.user.id,'use',2,`Label: ${cfg.brand_name} - ${cfg.product_name}`]);

    res.json({success:true, image_url: savedUrl, config: cfg, credits_used: 2});
  } catch(err){
    const status = err.message==='Insufficient credits' ? 402 : 500;
    res.status(status).json({error:err.message});
  }
});

export default router;
