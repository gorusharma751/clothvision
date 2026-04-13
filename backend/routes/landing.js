import express from 'express';
import { query } from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public: get CMS content
router.get('/cms', async(req,res)=>{
  try{
    const {rows}=await query("SELECT key,value FROM admin_settings WHERE category='landing_cms'");
    const cms={};
    rows.forEach(r=>{
      try{cms[r.key]=JSON.parse(r.value);}
      catch{cms[r.key]=r.value;}
    });
    res.json(cms);
  }catch{res.json({});}
});

// Admin: update CMS
router.put('/cms', authenticate, adminOnly, async(req,res)=>{
  const updates=req.body; // {key: value, ...}
  try{
    for(const [key,value] of Object.entries(updates)){
      const val=typeof value==='string'?value:JSON.stringify(value);
      await query(`INSERT INTO admin_settings (category,key,value) VALUES ('landing_cms',$1,$2) ON CONFLICT(category,key) DO UPDATE SET value=$2,updated_at=NOW()`,[key,val]);
    }
    res.json({success:true});
  }catch(err){res.status(500).json({error:err.message});}
});

// Admin: get all CMS for editing
router.get('/cms/all', authenticate, adminOnly, async(req,res)=>{
  try{
    const {rows}=await query("SELECT key,value,updated_at FROM admin_settings WHERE category='landing_cms' ORDER BY key");
    res.json(rows);
  }catch{res.json([]);}
});

export default router;
