// ADD this endpoint to backend/routes/auth.js BEFORE export default router;

router.post('/register', async (req, res) => {
  const { email, password, name, shop_name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Email, password and name required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const existing = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await query('INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4) RETURNING *',
      [email.toLowerCase(), hashed, name, 'owner']);
    await query('INSERT INTO shops (owner_id,name,theme,plan) VALUES ($1,$2,$3,$4)',
      [rows[0].id, shop_name || name + "'s Shop", 'dark-luxury', 'basic']);
    await query('INSERT INTO credits (owner_id,balance) VALUES ($1,$2)', [rows[0].id, 0]);
    res.json({ success: true, message: 'Account created. Please login.' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
