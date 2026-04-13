import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { generateVideoScript, generateTryOn, upscaleImage } from '../services/geminiAgents.js';
import { uploadToCloudinary, isCloudinaryEnabled } from '../services/cloudinaryService.js';

const router = express.Router();
router.use(authenticate);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.isAbsolute(process.env.UPLOAD_DIR||'./uploads') ? process.env.UPLOAD_DIR : path.resolve(__dirname,'..', process.env.UPLOAD_DIR||'./uploads');
const ensureDir = (uid) => { const d=path.join(UPLOAD_ROOT,String(uid)); fs.mkdirSync(d,{recursive:true}); return d; };
const storage = multer.diskStorage({ destination:(req,f,cb)=>cb(null,ensureDir(req.user.id)), filename:(req,f,cb)=>cb(null,`${uuidv4()}${path.extname(f.originalname)}`) });
const upload = multer({ storage, limits:{fileSize:20*1024*1024} });

const useCredits = async (uid, amt) => {
  const {rows} = await query('SELECT balance FROM credits WHERE owner_id=$1',[uid]);
  if(!rows.length||rows[0].balance<amt) throw new Error('Insufficient credits');
  await query('UPDATE credits SET balance=balance-$1,total_used=total_used+$1,updated_at=NOW() WHERE owner_id=$2',[amt,uid]);
};

const VIDEO_TYPES = [
  { id:'showcase', label:'Product Showcase', desc:'Professional product display', emoji:'🎬', credits:5 },
  { id:'how_to_use', label:'How to Use', desc:'Usage demonstration', emoji:'📖', credits:5 },
  { id:'how_to_assemble', label:'How to Assemble', desc:'Assembly guide', emoji:'🔧', credits:5 },
  { id:'size_ratio', label:'Size on Body', desc:'Size comparison with model', emoji:'📏', credits:6 },
  { id:'lifestyle', label:'Lifestyle/Fashion', desc:'Fashion lifestyle video', emoji:'✨', credits:6 },
  { id:'sample_demo', label:'Sample Demo', desc:'Quick product demo animation', emoji:'⚡', credits:3 },
];

router.get('/types', (req, res) => res.json(VIDEO_TYPES));

// Generate video script + frames
router.post('/generate-script', upload.fields([{name:'product_image'},{name:'model_image'}]), async (req, res) => {
  try {
    if(!req.files?.product_image) return res.status(400).json({error:'Product image required'});
    const {product_name, product_category, product_color, video_type, description} = req.body;
    const productDetails = { name: product_name||'Product', category: product_category||'clothing', color: product_color||'', description: description||'' };
    
    const script = await generateVideoScript(productDetails, video_type||'showcase');
    
    // Generate key frame images for video preview (4 frames)
    const frames = [];
    if(req.files?.model_image) {
      const angles = ['front','3_4','back','closeup'];
      for(let i=0; i<Math.min(2,angles.length); i++){
        try {
          const r = await generateTryOn(req.files.model_image[0].path, req.files.product_image[0].path, productDetails, angles[i]);
          if(r.success){
            const buf = Buffer.from(r.imageData,'base64');
            let savedUrl;
            if(isCloudinaryEnabled()){
              savedUrl = await uploadToCloudinary(buf, {folder:`clothvision/${req.user.id}/video_frames`});
            } else {
              savedUrl = path.join(ensureDir(req.user.id),`vframe_${uuidv4()}.jpg`).replace(/\\/g,'/');
              fs.writeFileSync(savedUrl,buf);
            }
            frames.push({angle:angles[i],url:savedUrl});
          }
        } catch(e){ console.error(`Frame ${i}:`,e.message); }
      }
    }

    res.json({ success:true, script, frames, video_type: video_type||'showcase', note: 'Use these frames + script with Luma AI, Runway, or Kling AI to generate the actual video' });
  } catch(err){ res.status(500).json({error:err.message}); }
});

// Admin: get video prompts config
router.get('/admin-prompts', authenticate, async (req, res) => {
  if(req.user.role!=='admin') return res.status(403).json({error:'Admin only'});
  try {
    const {rows} = await query("SELECT * FROM admin_settings WHERE category='video_prompts'");
    res.json(rows);
  } catch { res.json([]); }
});

router.put('/admin-prompts', authenticate, async (req, res) => {
  if(req.user.role!=='admin') return res.status(403).json({error:'Admin only'});
  const {video_type, custom_prompt} = req.body;
  try {
    await query(`INSERT INTO admin_settings (category, key, value) VALUES ('video_prompts',$1,$2) ON CONFLICT (category,key) DO UPDATE SET value=$2`, [video_type, custom_prompt]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

export default router;
