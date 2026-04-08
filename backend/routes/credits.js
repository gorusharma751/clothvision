import express from 'express';
import { query } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/balance', async (req, res) => {
  try {
    const { rows } = await query('SELECT balance, total_used FROM credits WHERE owner_id=$1', [req.user.id]);
    res.json(rows[0] || { balance: 0, total_used: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM credit_transactions WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/request', async (req, res) => {
  const { amount_requested, message } = req.body;
  if (!amount_requested) return res.status(400).json({ error: 'Amount required' });
  try {
    const { rows } = await query('INSERT INTO credit_requests (owner_id, amount_requested, message) VALUES ($1,$2,$3) RETURNING *', [req.user.id, amount_requested, message]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my-requests', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM credit_requests WHERE owner_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
