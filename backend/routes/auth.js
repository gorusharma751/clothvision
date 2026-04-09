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
      SELECT u.*, s.name as shop_name, s.logo_url, s.theme, s.plan,
             COALESCE(c.balance,0) as credits
      FROM users u
      LEFT JOIN shops s ON s.owner_id = u.id
      LEFT JOIN credits c ON c.owner_id = u.id
      WHERE u.email = $1`, [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'clothvision_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, shop_name: user.shop_name, logo_url: user.logo_url, theme: user.theme, plan: user.plan, credits: user.credits } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.email, u.name, u.role, s.name as shop_name, s.logo_url, s.theme, s.plan,
             COALESCE(c.balance,0) as credits
      FROM users u
      LEFT JOIN shops s ON s.owner_id = u.id
      LEFT JOIN credits c ON c.owner_id = u.id
      WHERE u.id = $1`, [req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
