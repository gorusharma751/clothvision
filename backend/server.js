import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { initDB, query } from './database.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import productRoutes from './routes/products.js';
import creditRoutes from './routes/credits.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/credits', creditRoutes);

// Serve uploaded images
app.use('/uploads', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).send('Unauthorized');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const createAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@clothvision.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const { rows } = await query("SELECT id FROM users WHERE email=$1", [email]);
    if (!rows.length) {
      const hashed = await bcrypt.hash(password, 10);
      await query("INSERT INTO users (email, password, name, role) VALUES ($1,$2,$3,$4)", [email, hashed, 'Super Admin', 'admin']);
      console.log(`✅ Admin created: ${email} / ${password}`);
    }
  } catch (err) { console.error('Admin create error:', err.message); }
};

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await initDB();
    await createAdmin();
    app.listen(PORT, () => {
      console.log(`🚀 ClothVision API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server startup failed. Check PostgreSQL service and DATABASE_URL.');
    process.exit(1);
  }
};

startServer();

export default app;
