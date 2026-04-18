// Admin payment/subscription routes — for admins to request plans & pay
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, adminOnly);

const storage = multer.diskStorage({
  destination: (req, f, cb) => {
    const destinationDir = './uploads/screenshots';
    fs.mkdirSync(destinationDir, { recursive: true });
    cb(null, destinationDir);
  },
  filename: (req,f,cb) => cb(null, `${uuidv4()}${path.extname(f.originalname)}`)
});
const upload = multer({storage, limits:{fileSize:5*1024*1024}});

// Get my subscription info
router.get('/my-subscription', async (req, res) => {
  try {
    const {rows} = await query(`
      SELECT asub.*,sp.name as plan_name,sp.slug,sp.price_monthly,sp.price_yearly,
             sp.credits_monthly,sp.max_users,sp.max_products,sp.features
      FROM admin_subscriptions asub
      JOIN saas_plans sp ON sp.id=asub.plan_id
      WHERE asub.admin_id=$1
    `, [req.user.id]);
    res.json(rows[0] || null);
  } catch(err){ res.status(500).json({error:err.message}); }
});

// Get all available plans
router.get('/plans', async (req, res) => {
  try {
    const {rows} = await query('SELECT * FROM saas_plans WHERE is_active=true ORDER BY sort_order');
    res.json(rows);
  } catch(err){ res.status(500).json({error:err.message}); }
});

// Get payment settings (UPI, bank, etc.)
router.get('/payment-info', async (req, res) => {
  try {
    const {rows} = await query("SELECT key,value FROM super_admin_settings WHERE category='payment'");
    const info = {};
    rows.forEach(r => { info[r.key] = r.value; });
    res.json(info);
  } catch(err){ res.status(500).json({error:err.message}); }
});

// Submit payment request (with screenshot)
router.post('/payment-request', upload.single('screenshot'), async (req, res) => {
  const {plan_slug, billing_cycle, amount, payment_method, transaction_ref, notes} = req.body;
  try {
    const normalizedAmount = Number(amount) || 0;
    let planId = null;
    if(plan_slug) {
      const {rows} = await query('SELECT id FROM saas_plans WHERE slug=$1',[plan_slug]);
      if(rows.length) planId = rows[0].id;
    }
    const screenshotUrl = req.file ? `/uploads/screenshots/${req.file.filename}` : null;
    const {rows} = await query(
      'INSERT INTO payment_transactions (admin_id,type,amount,status,payment_method,transaction_ref,description,plan_id,screenshot_url,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id,'subscription',normalizedAmount,'pending',payment_method||'upi',transaction_ref,`Plan: ${plan_slug}, ${billing_cycle}`,planId,screenshotUrl,notes]
    );
    res.json({success:true, transaction: rows[0], message:'Payment request submitted. Will be activated within 24 hours.'});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// Submit credit purchase request
router.post('/credit-request', upload.single('screenshot'), async (req, res) => {
  const {amount, credits_requested, payment_method, transaction_ref, notes} = req.body;
  try {
    const normalizedAmount = Number(amount) || 0;
    const normalizedCredits = Number(credits_requested) || 0;
    const screenshotUrl = req.file ? `/uploads/screenshots/${req.file.filename}` : null;
    const {rows} = await query(
      'INSERT INTO payment_transactions (admin_id,type,amount,status,payment_method,transaction_ref,description,credits_added,screenshot_url,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id,'credits',normalizedAmount,'pending',payment_method||'upi',transaction_ref,`Credits request: ${normalizedCredits} credits`,normalizedCredits,screenshotUrl,notes]
    );
    res.json({success:true, transaction: rows[0]});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// My payment history
router.get('/my-payments', async (req, res) => {
  try {
    const {rows} = await query(`
      SELECT pt.*,sp.name as plan_name FROM payment_transactions pt
      LEFT JOIN saas_plans sp ON sp.id=pt.plan_id
      WHERE pt.admin_id=$1 ORDER BY pt.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch(err){ res.status(500).json({error:err.message}); }
});

// My feature flags
router.get('/my-features', async (req, res) => {
  try {
    const [{rows:flags},{rows:sub}] = await Promise.all([
      query('SELECT * FROM admin_feature_flags WHERE admin_id=$1',[req.user.id]),
      query('SELECT sp.features,asub.status,asub.expires_at FROM admin_subscriptions asub JOIN saas_plans sp ON sp.id=asub.plan_id WHERE asub.admin_id=$1',[req.user.id]),
    ]);
    const rawPlanFeatures = sub[0]?.features || [];
    const planFeatures = (() => {
      if (Array.isArray(rawPlanFeatures)) return rawPlanFeatures;
      if (typeof rawPlanFeatures === 'string') {
        try {
          const parsed = JSON.parse(rawPlanFeatures);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    })();
    const featureMap = {};
    planFeatures.forEach(f => featureMap[f] = true);
    flags.forEach(f => featureMap[f.feature_key] = f.enabled);
    res.json({plan_features: featureMap, overrides: flags, subscription: sub[0]||null});
  } catch(err){ res.status(500).json({error:err.message}); }
});

export default router;
