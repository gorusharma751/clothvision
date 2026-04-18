import jwt from 'jsonwebtoken';
import { query } from '../database.js';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is missing' });

  try {
    const decoded = jwt.verify(token, jwtSecret);

    const { rows } = await query('SELECT id, email, role, admin_id FROM users WHERE id=$1', [decoded.id]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    req.user = {
      id: rows[0].id,
      email: rows[0].email,
      role: rows[0].role,
      admin_id: rows[0].admin_id || null
    };

    next();
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  next();
};

export const adminOnly = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

export const ownerOnly = (req, res, next) => {
  if (!['owner', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  next();
};

const parseFeatureList = (features) => {
  if (Array.isArray(features)) return features;

  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

// Check if admin's subscription has access to a feature.
export const checkFeature = (featureKey) => async (req, res, next) => {
  if (!featureKey || req.user.role === 'superadmin') {
    return next();
  }

  const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;
  if (!adminId) {
    return next();
  }

  try {
    const { rows: flags } = await query(
      'SELECT enabled FROM admin_feature_flags WHERE admin_id=$1 AND feature_key=$2 LIMIT 1',
      [adminId, featureKey]
    );

    if (flags.length) {
      if (!flags[0].enabled) {
        return res.status(403).json({
          error: `Feature "${featureKey}" is not available on your plan`
        });
      }

      return next();
    }

    const { rows: subscriptions } = await query(
      `SELECT sp.features, asub.status, asub.expires_at
       FROM admin_subscriptions asub
       JOIN saas_plans sp ON sp.id = asub.plan_id
       WHERE asub.admin_id = $1
       LIMIT 1`,
      [adminId]
    );

    if (!subscriptions.length) {
      return next();
    }

    const subscription = subscriptions[0];
    if (subscription.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Subscription expired. Please renew.' });
    }

    const planFeatures = parseFeatureList(subscription.features);
    if (!planFeatures.includes('all_features') && !planFeatures.includes(featureKey)) {
      return res.status(403).json({
        error: `Feature "${featureKey}" is not available on your current plan.`
      });
    }

    return next();
  } catch (err) {
    console.error('checkFeature middleware error:', err.message);
    return next();
  }
};
