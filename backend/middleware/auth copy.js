import jwt from 'jsonwebtoken';
import { query } from '../database.js';

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'clothvision_secret');
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

export const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Super admin access required' });
  next();
};

export const adminOnly = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ error: 'Admin access required' });
  next();
};

export const ownerOnly = (req, res, next) => {
  if (!['owner', 'admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ error: 'Unauthorized' });
  next();
};

// Check if admin's subscription is active & has feature access
export const checkFeature = (featureKey) => async (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;
  if (!adminId) return next();
  try {
    // Check feature flag override
    const { rows: flags } = await query(
      'SELECT enabled FROM admin_feature_flags WHERE admin_id=$1 AND feature_key=$2',
      [adminId, featureKey]
    );
    if (flags.length) {
      if (!flags[0].enabled) return res.status(403).json({ error: `Feature "${featureKey}" not available on your plan` });
      return next();
    }
    // Check plan features
    const { rows: sub } = await query(
      `SELECT sp.features, asub.status, asub.expires_at 
       FROM admin_subscriptions asub 
       JOIN saas_plans sp ON sp.id = asub.plan_id 
       WHERE asub.admin_id = $1`,
      [adminId]
    );
    if (!sub.length) return next(); // No subscription = default access
    const { features, status, expires_at } = sub[0];
    if (status === 'suspended') return res.status(403).json({ error: 'Account suspended. Contact admin.' });
    if (expires_at && new Date(expires_at) < new Date()) return res.status(403).json({ error: 'Subscription expired. Please renew.' });
    const planFeatures = typeof features === 'string' ? JSON.parse(features) : features;
    if (!planFeatures.includes(featureKey) && !planFeatures.includes('all_features')) {
      return res.status(403).json({ error: `Feature "${featureKey}" not available on your current plan. Upgrade to access.` });
    }
    next();
  } catch (err) { next(); }
};
