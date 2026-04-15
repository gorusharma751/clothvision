import jwt from 'jsonwebtoken';
import { query } from '../database.js';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is missing' });

  try {
    const decoded = jwt.verify(token, jwtSecret);

    const { rows } = await query('SELECT id, email, role FROM users WHERE id=$1', [decoded.id]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    req.user = {
      id: rows[0].id,
      email: rows[0].email,
      role: rows[0].role
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

export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

export const ownerOnly = (req, res, next) => {
  if (!['owner', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Unauthorized' });
  next();
};
