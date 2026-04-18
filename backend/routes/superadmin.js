import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database.js';
import { authenticate, superAdminOnly } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, superAdminOnly);

// ── Dashboard Stats ──
router.get('/stats', async (req, res) => {
  try {
    const [admins, users, revenue, pending, activesSubs] = await Promise.all([
      query("SELECT COUNT(*) FROM users WHERE role='admin'"),
      query("SELECT COUNT(*) FROM users WHERE role='owner'"),
      query("SELECT COALESCE(SUM(amount),0) as total FROM payment_transactions WHERE status='completed'"),
      query("SELECT COUNT(*) FROM payment_transactions WHERE status='pending'"),
      query("SELECT COUNT(*) FROM admin_subscriptions WHERE status='active'"),
    ]);
    res.json({
      total_admins: parseInt(admins.rows[0].count),
      total_users: parseInt(users.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
      pending_payments: parseInt(pending.rows[0].count),
      active_subscriptions: parseInt(activesSubs.rows[0].count),
    });
  } catch(err){ res.status(500).json({error:err.message}); }
});

// ── Plans CRUD ──
router.get('/plans', async (req, res) => {
  try {
    const {rows} = await query('SELECT * FROM saas_plans ORDER BY sort_order');
    res.json(rows);
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.post('/plans', async (req, res) => {
  const {name,slug,description,price_monthly,price_yearly,credits_monthly,max_users,max_products,features,sort_order} = req.body;
  try {
    const {rows} = await query(
      'INSERT INTO saas_plans (name,slug,description,price_monthly,price_yearly,credits_monthly,max_users,max_products,features,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [name,slug,description,price_monthly||0,price_yearly||0,credits_monthly||100,max_users||5,max_products||100,JSON.stringify(features||[]),sort_order||0]
    );
    res.json(rows[0]);
  } catch(err){ if(err.code==='23505') return res.status(400).json({error:'Slug already exists'}); res.status(500).json({error:err.message}); }
});

router.put('/plans/:id', async (req, res) => {
  const {name,description,price_monthly,price_yearly,credits_monthly,max_users,max_products,features,is_active,sort_order} = req.body;
  try {
    const {rows} = await query(
      'UPDATE saas_plans SET name=$1,description=$2,price_monthly=$3,price_yearly=$4,credits_monthly=$5,max_users=$6,max_products=$7,features=$8,is_active=$9,sort_order=$10,updated_at=NOW() WHERE id=$11 RETURNING *',
      [name,description,price_monthly,price_yearly,credits_monthly,max_users,max_products,JSON.stringify(features||[]),is_active,sort_order,req.params.id]
    );
    res.json(rows[0]);
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    await query('UPDATE saas_plans SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// ── Admin Management ──
router.get('/admins', async (req, res) => {
  try {
    const {rows} = await query(`
      SELECT u.id,u.email,u.name,u.created_at,
             s.name as shop_name,s.plan as old_plan,
             asub.status as sub_status,asub.expires_at,asub.billing_cycle,
             sp.name as plan_name,sp.slug as plan_slug,sp.credits_monthly,
             COALESCE(c.balance,0) as credits,COALESCE(c.total_used,0) as credits_used,
             COUNT(DISTINCT p.id) as products_count,
             COUNT(DISTINCT ou.id) as users_count,
             COALESCE(pt.total_paid,0) as total_paid
      FROM users u
      LEFT JOIN shops s ON s.owner_id=u.id
      LEFT JOIN admin_subscriptions asub ON asub.admin_id=u.id
      LEFT JOIN saas_plans sp ON sp.id=asub.plan_id
      LEFT JOIN credits c ON c.owner_id=u.id
      LEFT JOIN products p ON p.owner_id=u.id
      LEFT JOIN users ou ON ou.admin_id=u.id AND ou.role='owner'
      LEFT JOIN (
        SELECT admin_id, SUM(amount) as total_paid FROM payment_transactions WHERE status='completed' GROUP BY admin_id
      ) pt ON pt.admin_id=u.id
      WHERE u.role='admin'
      GROUP BY u.id,s.name,s.plan,asub.status,asub.expires_at,asub.billing_cycle,sp.name,sp.slug,sp.credits_monthly,c.balance,c.total_used,pt.total_paid
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.post('/admins', async (req, res) => {
  const {email,password,name,shop_name,plan_slug,billing_cycle,initial_credits,trial_days} = req.body;
  if(!email||!password) return res.status(400).json({error:'Email and password required'});
  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedInitialCredits = Number(initial_credits) || 0;
    const normalizedTrialDays = Number(trial_days) || 0;
    const hashed = await bcrypt.hash(password, 10);
    const userRes = await query(
      'INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4) RETURNING *',
      [normalizedEmail,hashed,name,'admin']
    );
    const user = userRes.rows[0];
    await query('INSERT INTO shops (owner_id,name,plan) VALUES ($1,$2,$3)', [user.id,shop_name||name+"'s Shop",'basic']);
    await query('INSERT INTO credits (owner_id,balance) VALUES ($1,$2)', [user.id,normalizedInitialCredits]);
    if(normalizedInitialCredits>0) await query('INSERT INTO credit_transactions (owner_id,type,amount,description,added_by) VALUES ($1,$2,$3,$4,$5)',[user.id,'add',normalizedInitialCredits,'Initial credits by super admin',req.user.id]);

    // Assign plan subscription
    if(plan_slug) {
      const {rows:plans} = await query('SELECT id FROM saas_plans WHERE slug=$1', [plan_slug]);
      if(plans.length) {
        const expiresAt = normalizedTrialDays ? new Date(Date.now() + normalizedTrialDays*86400000) : null;
        await query(
          'INSERT INTO admin_subscriptions (admin_id,plan_id,status,billing_cycle,expires_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(admin_id) DO UPDATE SET plan_id=$2,status=$3,billing_cycle=$4,expires_at=$5',
          [user.id,plans[0].id,normalizedTrialDays?'trial':'active',billing_cycle||'monthly',expiresAt]
        );
      }
    }
    res.json({success:true,user});
  } catch(err){ if(err.code==='23505') return res.status(400).json({error:'Email already exists'}); res.status(500).json({error:err.message}); }
});

router.put('/admins/:id', async (req, res) => {
  const {name,shop_name,plan_slug,billing_cycle,sub_status,expires_at,notes} = req.body;
  try {
    if(name) await query('UPDATE users SET name=$1,updated_at=NOW() WHERE id=$2',[name,req.params.id]);
    if(shop_name) await query('UPDATE shops SET name=$1,updated_at=NOW() WHERE owner_id=$2',[shop_name,req.params.id]);
    if(plan_slug || sub_status || billing_cycle || expires_at || typeof notes === 'string') {
      let planId = null;
      if(plan_slug) {
        const {rows} = await query('SELECT id FROM saas_plans WHERE slug=$1',[plan_slug]);
        if(rows.length) planId = rows[0].id;
      }

      const { rows: existingSubscriptionRows } = await query(
        'SELECT plan_id, status, billing_cycle, expires_at, notes FROM admin_subscriptions WHERE admin_id=$1',
        [req.params.id]
      );
      const existingSubscription = existingSubscriptionRows[0] || {};

      const nextPlanId = planId || existingSubscription.plan_id || null;
      const nextStatus = sub_status || existingSubscription.status || 'trial';
      const nextBillingCycle = billing_cycle || existingSubscription.billing_cycle || 'monthly';
      const nextExpiresAt = expires_at || existingSubscription.expires_at || null;
      const nextNotes = typeof notes === 'string' ? notes : (existingSubscription.notes || null);

      await query(
        `INSERT INTO admin_subscriptions (admin_id,plan_id,status,billing_cycle,expires_at,notes)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT(admin_id)
         DO UPDATE SET
           plan_id=$2,
           status=$3,
           billing_cycle=$4,
           expires_at=$5,
           notes=$6,
           updated_at=NOW()`,
        [req.params.id, nextPlanId, nextStatus, nextBillingCycle, nextExpiresAt, nextNotes]
      );
    }
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// Suspend/Activate admin
router.put('/admins/:id/status', async (req, res) => {
  const {status} = req.body;
  try {
    await query('UPDATE admin_subscriptions SET status=$1,updated_at=NOW() WHERE admin_id=$2',[status,req.params.id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    await query("DELETE FROM users WHERE id=$1 AND role='admin'",[req.params.id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// ── Feature Flags per Admin ──
router.get('/admins/:id/features', async (req, res) => {
  try {
    const [{rows:flags},{rows:sub}] = await Promise.all([
      query('SELECT * FROM admin_feature_flags WHERE admin_id=$1',[req.params.id]),
      query('SELECT sp.features FROM admin_subscriptions asub JOIN saas_plans sp ON sp.id=asub.plan_id WHERE asub.admin_id=$1',[req.params.id]),
    ]);
    res.json({flags, plan_features: sub[0]?.features||[]});
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.post('/admins/:id/features', async (req, res) => {
  const {feature_key,enabled,value} = req.body;
  try {
    await query('INSERT INTO admin_feature_flags (admin_id,feature_key,enabled,value) VALUES ($1,$2,$3,$4) ON CONFLICT(admin_id,feature_key) DO UPDATE SET enabled=$3,value=$4',[req.params.id,feature_key,enabled,value||null]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.delete('/admins/:id/features/:key', async (req, res) => {
  try {
    await query('DELETE FROM admin_feature_flags WHERE admin_id=$1 AND feature_key=$2',[req.params.id,req.params.key]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// ── Credits Management ──
router.post('/admins/:id/credits', async (req, res) => {
  const {amount,description,payment_ref} = req.body;
  if(!amount) return res.status(400).json({error:'Amount required'});
  try {
    await query('INSERT INTO credits (owner_id,balance) VALUES ($1,$2) ON CONFLICT(owner_id) DO UPDATE SET balance=credits.balance+$2,updated_at=NOW()',[req.params.id,amount]);
    await query('INSERT INTO credit_transactions (owner_id,type,amount,description,added_by) VALUES ($1,$2,$3,$4,$5)',[req.params.id,'add',amount,description||'Credits by super admin',req.user.id]);
    if(payment_ref) await query('INSERT INTO payment_transactions (admin_id,type,amount,status,transaction_ref,description,credits_added,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[req.params.id,'credits',0,'completed',payment_ref,description,amount,req.user.id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// ── Payment Transactions ──
router.get('/payments', async (req, res) => {
  try {
    const {rows} = await query(`
      SELECT pt.*,u.email,u.name,s.name as shop_name
      FROM payment_transactions pt
      JOIN users u ON u.id=pt.admin_id
      LEFT JOIN shops s ON s.owner_id=pt.admin_id
      ORDER BY pt.created_at DESC LIMIT 200
    `);
    res.json(rows);
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.post('/payments', async (req, res) => {
  const {admin_id,type,amount,payment_method,transaction_ref,description,plan_slug,credits_added,notes} = req.body;
  try {
    const normalizedCreditsAdded = Number(credits_added) || 0;
    let planId = null;
    if(plan_slug) { const {rows} = await query('SELECT id FROM saas_plans WHERE slug=$1',[plan_slug]); if(rows.length) planId=rows[0].id; }
    const {rows} = await query(
      'INSERT INTO payment_transactions (admin_id,type,amount,status,payment_method,transaction_ref,description,plan_id,credits_added,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [admin_id,type,amount,'completed',payment_method||'manual',transaction_ref,description,planId,normalizedCreditsAdded,notes,req.user.id]
    );
    // If credits included, add them
    if(normalizedCreditsAdded>0) {
      await query('INSERT INTO credits (owner_id,balance) VALUES ($1,$2) ON CONFLICT(owner_id) DO UPDATE SET balance=credits.balance+$2,updated_at=NOW()',[admin_id,normalizedCreditsAdded]);
      await query('INSERT INTO credit_transactions (owner_id,type,amount,description,added_by) VALUES ($1,$2,$3,$4,$5)',[admin_id,'add',normalizedCreditsAdded,`Payment: ${description||type}`,req.user.id]);
    }
    // If plan subscription, update it
    if(planId && type==='subscription') {
      const cycle = req.body.billing_cycle || 'monthly';
      const months = cycle==='yearly'?12:1;
      const expiresAt = new Date(Date.now() + months*30*86400000);
      await query('INSERT INTO admin_subscriptions (admin_id,plan_id,status,billing_cycle,expires_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(admin_id) DO UPDATE SET plan_id=$2,status=$3,billing_cycle=$4,expires_at=$5,updated_at=NOW()',[admin_id,planId,'active',cycle,expiresAt]);
    }
    res.json(rows[0]);
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.put('/payments/:id', async (req, res) => {
  const {status,notes} = req.body;
  try {
    await query('UPDATE payment_transactions SET status=$1,notes=$2 WHERE id=$3',[status,notes,req.params.id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// ── Platform Settings ──
router.get('/settings', async (req, res) => {
  try {
    const {rows} = await query('SELECT * FROM super_admin_settings ORDER BY category,key');
    res.json(rows);
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.put('/settings', async (req, res) => {
  const updates = req.body; // {key:value,...}
  try {
    const inferCategory = (key) => {
      if (['platform_name', 'support_email'].includes(key)) return 'branding';
      if (['trial_days', 'trial_credits'].includes(key)) return 'subscription';
      if (['upi_id', 'upi_name', 'bank_name', 'account_number', 'ifsc_code', 'account_holder', 'razorpay_key_id', 'razorpay_key_secret'].includes(key)) return 'payment';
      if (['credit_cost_inr', 'min_credit_purchase', 'gst_number'].includes(key)) return 'pricing';
      return 'general';
    };

    for(const [key,value] of Object.entries(updates)) {
      await query(
        `INSERT INTO super_admin_settings (key, value, category, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value=EXCLUDED.value, category=EXCLUDED.category, updated_at=NOW()`,
        [key, String(value || ''), inferCategory(key)]
      );
    }
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

// ── Payment requests from admins ──
router.get('/payment-requests', async (req, res) => {
  try {
    const {rows} = await query(`
      SELECT pt.*,u.email,u.name,s.name as shop_name,sp.name as plan_name,sp.slug as plan_slug
      FROM payment_transactions pt
      JOIN users u ON u.id=pt.admin_id
      LEFT JOIN shops s ON s.owner_id=pt.admin_id
      LEFT JOIN saas_plans sp ON sp.id=pt.plan_id
      WHERE pt.status='pending'
      ORDER BY pt.created_at DESC
    `);
    res.json(rows);
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.put('/payment-requests/:id/approve', async (req, res) => {
  const {credits_to_add, activate_plan_slug, billing_cycle, expires_days} = req.body;
  try {
    const {rows:txn} = await query('SELECT * FROM payment_transactions WHERE id=$1',[req.params.id]);
    if(!txn.length) return res.status(404).json({error:'Not found'});
    const t = txn[0];
    await query('UPDATE payment_transactions SET status=$1,notes=$2 WHERE id=$3',['completed',req.body.notes||'Approved by super admin',req.params.id]);
    if(credits_to_add>0) {
      await query('INSERT INTO credits (owner_id,balance) VALUES ($1,$2) ON CONFLICT(owner_id) DO UPDATE SET balance=credits.balance+$2,updated_at=NOW()',[t.admin_id,credits_to_add]);
      await query('INSERT INTO credit_transactions (owner_id,type,amount,description,added_by) VALUES ($1,$2,$3,$4,$5)',[t.admin_id,'add',credits_to_add,'Payment approved',req.user.id]);
    }
    if(activate_plan_slug) {
      const {rows:plans} = await query('SELECT id FROM saas_plans WHERE slug=$1',[activate_plan_slug]);
      if(plans.length) {
        const days = expires_days || (billing_cycle==='yearly'?365:30);
        const expiresAt = new Date(Date.now() + days*86400000);
        await query('INSERT INTO admin_subscriptions (admin_id,plan_id,status,billing_cycle,expires_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(admin_id) DO UPDATE SET plan_id=$2,status=$3,billing_cycle=$4,expires_at=$5,updated_at=NOW()',[t.admin_id,plans[0].id,'active',billing_cycle||'monthly',expiresAt]);
      }
    }
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

router.put('/payment-requests/:id/reject', async (req, res) => {
  try {
    await query('UPDATE payment_transactions SET status=$1,notes=$2 WHERE id=$3',['failed',req.body.reason||'Rejected',req.params.id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error:err.message}); }
});

export default router;
