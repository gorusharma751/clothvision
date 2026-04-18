import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, adminOnly);

const currentAdminScope = (req) => (req.user.role === 'superadmin' ? null : req.user.id);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const adminScope = currentAdminScope(req);

    const [owners, products, images, requests] = await Promise.all(
      adminScope
        ? [
            query("SELECT COUNT(*) FROM users WHERE role='owner' AND (admin_id=$1 OR admin_id IS NULL)", [adminScope]),
            query(
              `SELECT COUNT(*)
               FROM products p
               JOIN users u ON u.id = p.owner_id
               WHERE u.admin_id = $1 OR u.admin_id IS NULL`,
              [adminScope]
            ),
            query(
              `SELECT COUNT(*)
               FROM generated_images gi
               JOIN users u ON u.id = gi.owner_id
               WHERE u.admin_id = $1 OR u.admin_id IS NULL`,
              [adminScope]
            ),
            query(
              `SELECT COUNT(*)
               FROM credit_requests cr
               JOIN users u ON u.id = cr.owner_id
               WHERE cr.status = 'pending' AND (u.admin_id = $1 OR u.admin_id IS NULL)`,
              [adminScope]
            )
          ]
        : [
            query("SELECT COUNT(*) FROM users WHERE role='owner'"),
            query('SELECT COUNT(*) FROM products'),
            query('SELECT COUNT(*) FROM generated_images'),
            query("SELECT COUNT(*) FROM credit_requests WHERE status='pending'")
          ]
    );

    res.json({
      total_owners: parseInt(owners.rows[0].count),
      total_products: parseInt(products.rows[0].count),
      total_images: parseInt(images.rows[0].count),
      pending_credit_requests: parseInt(requests.rows[0].count)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List all owners
router.get('/owners', async (req, res) => {
  try {
    const adminScope = currentAdminScope(req);
    const { rows } = await query(`
      SELECT u.id, u.email, u.name, u.created_at, s.name as shop_name, s.logo_url, s.theme, s.plan, s.is_active,
             COALESCE(c.balance, 0) as credits, COALESCE(c.total_used, 0) as credits_used,
             COUNT(DISTINCT p.id) as products_count
      FROM users u
      LEFT JOIN shops s ON s.owner_id = u.id
      LEFT JOIN credits c ON c.owner_id = u.id
      LEFT JOIN products p ON p.owner_id = u.id
      WHERE u.role = 'owner'
      ${adminScope ? 'AND (u.admin_id = $1 OR u.admin_id IS NULL)' : ''}
      GROUP BY u.id, s.name, s.logo_url, s.theme, s.plan, s.is_active, c.balance, c.total_used
      ORDER BY u.created_at DESC
    `, adminScope ? [adminScope] : []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create owner
router.post('/owners', async (req, res) => {
  const { email, password, name, shop_name, theme, plan, initial_credits } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const normalizedInitialCredits = Number(initial_credits) || 0;
    const ownerAdminId = currentAdminScope(req);
    const hashed = await bcrypt.hash(password, 10);
    const userRes = await query(
      'INSERT INTO users (email, password, name, role, admin_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email.toLowerCase(), hashed, name, 'owner', ownerAdminId]
    );
    const user = userRes.rows[0];
    
    await query('INSERT INTO shops (owner_id, name, theme, plan) VALUES ($1, $2, $3, $4)', [user.id, shop_name || name + "'s Shop", theme || 'dark-luxury', plan || 'basic']);
    await query('INSERT INTO credits (owner_id, balance) VALUES ($1, $2)', [user.id, normalizedInitialCredits]);
    
    if (normalizedInitialCredits > 0) {
      await query('INSERT INTO credit_transactions (owner_id, type, amount, description, added_by) VALUES ($1, $2, $3, $4, $5)', [user.id, 'add', normalizedInitialCredits, 'Initial credits by admin', req.user.id]);
    }
    
    res.json({ success: true, user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Update owner/shop
router.put('/owners/:id', async (req, res) => {
  const { name, shop_name, theme, plan, is_active } = req.body;
  try {
    const adminScope = currentAdminScope(req);
    const ownerUpdate = await query(
      `UPDATE users
       SET name=$1, updated_at=NOW()
       WHERE id=$2 AND role='owner' ${adminScope ? 'AND (admin_id=$3 OR admin_id IS NULL)' : ''}`,
      adminScope ? [name, req.params.id, adminScope] : [name, req.params.id]
    );
    if (!ownerUpdate.rowCount) return res.status(404).json({ error: 'Owner not found' });

    await query('UPDATE shops SET name=$1, theme=$2, plan=$3, is_active=$4, updated_at=NOW() WHERE owner_id=$5',
      [shop_name, theme, plan, is_active, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete owner
router.delete('/owners/:id', async (req, res) => {
  try {
    const adminScope = currentAdminScope(req);
    const deleted = await query(
      `DELETE FROM users
       WHERE id=$1 AND role=$2 ${adminScope ? 'AND (admin_id=$3 OR admin_id IS NULL)' : ''}`,
      adminScope ? [req.params.id, 'owner', adminScope] : [req.params.id, 'owner']
    );
    if (!deleted.rowCount) return res.status(404).json({ error: 'Owner not found' });

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Credit management
router.get('/credit-requests', async (req, res) => {
  try {
    const adminScope = currentAdminScope(req);
    const { rows } = await query(`
      SELECT cr.*, u.email, u.name, s.name as shop_name, COALESCE(c.balance,0) as current_balance
      FROM credit_requests cr
      JOIN users u ON u.id = cr.owner_id
      LEFT JOIN shops s ON s.owner_id = cr.owner_id
      LEFT JOIN credits c ON c.owner_id = cr.owner_id
      ${adminScope ? 'WHERE u.admin_id = $1 OR u.admin_id IS NULL' : ''}
      ORDER BY cr.created_at DESC
    `, adminScope ? [adminScope] : []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/credits/add', async (req, res) => {
  const { owner_id, amount, description } = req.body;
  if (!owner_id || !amount) return res.status(400).json({ error: 'owner_id and amount required' });
  try {
    const adminScope = currentAdminScope(req);
    if (adminScope) {
      const { rows } = await query('SELECT id FROM users WHERE id=$1 AND role=$2 AND (admin_id=$3 OR admin_id IS NULL)', [owner_id, 'owner', adminScope]);
      if (!rows.length) return res.status(404).json({ error: 'Owner not found' });
    }

    await query('INSERT INTO credits (owner_id, balance) VALUES ($1, $2) ON CONFLICT (owner_id) DO UPDATE SET balance = credits.balance + $2, updated_at = NOW()', [owner_id, amount]);
    await query('INSERT INTO credit_transactions (owner_id, type, amount, description, added_by) VALUES ($1, $2, $3, $4, $5)', [owner_id, 'add', amount, description || 'Credits added by admin', req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/credit-requests/:id', async (req, res) => {
  const { status, admin_note, credits_to_add } = req.body;
  try {
    const adminScope = currentAdminScope(req);
    const { rows: existingRequests } = await query(
      `SELECT cr.*
       FROM credit_requests cr
       JOIN users u ON u.id = cr.owner_id
       WHERE cr.id=$1 ${adminScope ? 'AND (u.admin_id=$2 OR u.admin_id IS NULL)' : ''}`,
      adminScope ? [req.params.id, adminScope] : [req.params.id]
    );
    if (!existingRequests.length) return res.status(404).json({ error: 'Credit request not found' });

    const { rows } = await query('UPDATE credit_requests SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *', [status, admin_note, req.params.id]);
    if (status === 'approved' && credits_to_add > 0) {
      const req_data = rows[0];
      await query('INSERT INTO credits (owner_id, balance) VALUES ($1, $2) ON CONFLICT (owner_id) DO UPDATE SET balance = credits.balance + $2', [req_data.owner_id, credits_to_add]);
      await query('INSERT INTO credit_transactions (owner_id, type, amount, description, added_by) VALUES ($1, $2, $3, $4, $5)', [req_data.owner_id, 'add', credits_to_add, 'Credit request approved', req.user.id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Credit cost settings
router.put('/plan-settings', async (req, res) => {
  const { plan_name, credits_per_image, tryon_credits, upscale_credits } = req.body;
  try {
    await query('UPDATE plan_settings SET credits_per_image=$1, tryon_credits=$2, upscale_credits=$3 WHERE plan_name=$4', [credits_per_image, tryon_credits, upscale_credits, plan_name]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/plan-settings', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM plan_settings ORDER BY price');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Prompt/settings management
router.get('/prompt-settings', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM admin_settings ORDER BY category, key');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/prompt-settings', async (req, res) => {
  const { category, key, value, description } = req.body;
  if (!category || !key) return res.status(400).json({ error: 'category and key are required' });

  try {
    await query(
      `INSERT INTO admin_settings (category,key,value,description)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (category,key)
       DO UPDATE SET value=$3, description=$4, updated_at=NOW()`,
      [category, key, value ?? '', description || '']
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/prompt-settings/:category', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM admin_settings WHERE category=$1 ORDER BY key', [req.params.category]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
