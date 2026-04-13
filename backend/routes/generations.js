import express from 'express';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// All generated images for this user
router.get('/all', async(req,res)=>{
  try{
    const {rows}=await query(`
      SELECT gi.*, p.name as product_name, p.category
      FROM generated_images gi
      JOIN products p ON p.id=gi.product_id
      WHERE gi.owner_id=$1
      ORDER BY gi.created_at DESC
      LIMIT 100
    `,[req.user.id]);
    res.json(rows);
  }catch(err){res.status(500).json({error:err.message});}
});

// Scene history
router.get('/scenes', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM scene_builds WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    if (err?.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// Label / poster history
router.get('/labels', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM label_generations WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    if (err?.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// Video script/frame history
router.get('/videos', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM video_generations WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    if (err?.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

export default router;
