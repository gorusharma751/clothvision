// REPLACE backend/routes/auth.js with this version
// Adds: superadmin role, admin_id on users, register returns plan info

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await query(`
      SELECT u.*,
             s.name as shop_name, s.logo_url, s.theme, s.plan as shop_plan,
             COALESCE(c.balance,0) as credits,
             asub.status as sub_status, asub.expires_at,
             sp.name as plan_name, sp.slug as plan_slug, sp.features as plan_features
      FROM users u
      LEFT JOIN shops s ON s.owner_id = u.id
      LEFT JOIN credits c ON c.owner_id = u.id
      LEFT JOIN admin_subscriptions asub ON asub.admin_id = CASE WHEN u.role='admin' THEN u.id ELSE u.admin_id END
      LEFT JOIN saas_plans sp ON sp.id = asub.plan_id
      WHERE u.email = $1
    `, [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    // Check if admin subscription is suspended
    if (user.role === 'admin' && user.sub_status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, admin_id: user.admin_id },
      process.env.JWT_SECRET || 'clothvision_secret',
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        shop_name: user.shop_name, logo_url: user.logo_url, theme: user.theme,
        plan: user.shop_plan, credits: user.credits,
        sub_status: user.sub_status, plan_name: user.plan_name,
        plan_slug: user.plan_slug, plan_features: user.plan_features,
        expires_at: user.expires_at,
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/register', async (req, res) => {
  const { email, password, name, shop_name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Email, password and name required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
  try {
    const existing = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4) RETURNING *',
      [email.toLowerCase(), hashed, name, 'admin']
    );
    await query('INSERT INTO shops (owner_id,name,theme,plan) VALUES ($1,$2,$3,$4)', [rows[0].id, shop_name||name+"'s Shop",'dark-luxury','basic']);
    await query('INSERT INTO credits (owner_id,balance) VALUES ($1,$2)', [rows[0].id, 0]);
    // Assign trial subscription
    const { rows: trialSettings } = await query("SELECT key,value FROM super_admin_settings WHERE key IN ('trial_days','trial_credits')");
    const trialDays = parseInt(trialSettings.find(s=>s.key==='trial_days')?.value||'7');
    const trialCredits = parseInt(trialSettings.find(s=>s.key==='trial_credits')?.value||'50');
    const {rows:starterPlan} = await query("SELECT id FROM saas_plans WHERE slug='starter' LIMIT 1");
    if(starterPlan.length) {
      const expiresAt = new Date(Date.now() + trialDays*86400000);
      await query('INSERT INTO admin_subscriptions (admin_id,plan_id,status,expires_at) VALUES ($1,$2,$3,$4)',[rows[0].id,starterPlan[0].id,'trial',expiresAt]);
    }
    if(trialCredits>0) {
      await query('INSERT INTO credits (owner_id,balance) VALUES ($1,$2) ON CONFLICT(owner_id) DO UPDATE SET balance=$2',[rows[0].id,trialCredits]);
    }
    res.json({ success: true, message: `Account created! ${trialDays}-day trial with ${trialCredits} credits.` });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id,u.email,u.name,u.role,
             s.name as shop_name,s.logo_url,s.theme,
             COALESCE(c.balance,0) as credits,
             asub.status as sub_status,asub.expires_at,
             sp.name as plan_name,sp.slug as plan_slug,sp.features as plan_features,sp.credits_monthly
      FROM users u
      LEFT JOIN shops s ON s.owner_id = u.id
      LEFT JOIN credits c ON c.owner_id = u.id
      LEFT JOIN admin_subscriptions asub ON asub.admin_id = CASE WHEN u.role='admin' THEN u.id ELSE u.admin_id END
      LEFT JOIN saas_plans sp ON sp.id = asub.plan_id
      WHERE u.id = $1
    `, [req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
