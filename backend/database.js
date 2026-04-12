import pg from 'pg';
import './loadEnv.js';

const { Pool } = pg;
const localFallbackDbUrl = 'postgresql://postgres:postgres@localhost:5432/clothvision';
const databaseUrl = String(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || localFallbackDbUrl).trim();

const shouldUseSsl = () => {
  const explicit = String(process.env.DB_SSL || '').trim().toLowerCase();
  if (explicit === 'true') return { rejectUnauthorized: false };
  if (explicit === 'false') return false;

  if (process.env.NODE_ENV === 'production') return { rejectUnauthorized: false };

  try {
    const host = new URL(databaseUrl).hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost) return { rejectUnauthorized: false };
  } catch {
    // If URL parsing fails, keep local/dev default below.
  }

  return false;
};

const normalizeDbConnectionError = (error) => {
  const raw = String(error?.message || error || 'Database connection failed');

  if (/ENOTFOUND/i.test(raw) && /railway\.internal/i.test(raw + ' ' + databaseUrl)) {
    return new Error(
      'Cannot resolve postgres.railway.internal. Use a Railway Postgres URL reachable from this runtime (same project private network or Railway public connection URL).'
    );
  }

  if (/SSL off|no pg_hba\.conf entry/i.test(raw)) {
    return new Error(
      'Postgres rejected a non-SSL connection. Set NODE_ENV=production or DB_SSL=true for managed Postgres providers.'
    );
  }

  return error;
};

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl()
});

export const query = (text, params) => pool.query(text, params);

export const initDB = async () => {
  const isUsingLocalFallback = databaseUrl === localFallbackDbUrl;
  if (process.env.NODE_ENV === 'production' && isUsingLocalFallback) {
    throw new Error('DATABASE_URL is not set for production. Set a real Postgres connection string (not localhost).');
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    throw normalizeDbConnectionError(err);
  }

  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'owner',
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        location TEXT,
        description TEXT,
        theme VARCHAR(50) DEFAULT 'dark-luxury',
        plan VARCHAR(50) DEFAULT 'basic',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        balance INTEGER DEFAULT 0,
        total_used INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credit_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        added_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credit_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount_requested INTEGER NOT NULL,
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        color VARCHAR(100),
        size_range VARCHAR(100),
        material VARCHAR(200),
        price DECIMAL(10,2),
        brand VARCHAR(255),
        original_image TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS generated_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        image_type VARCHAR(50),
        angle VARCHAR(100),
        image_url TEXT NOT NULL,
        upscaled_url TEXT,
        platform VARCHAR(50),
        is_upscaled BOOLEAN DEFAULT false,
        credits_used INTEGER DEFAULT 1,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS scene_builds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        product_image TEXT NOT NULL,
        background_image TEXT,
        config JSONB,
        result_images JSONB,
        credits_used INTEGER DEFAULT 2,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS amazon_flipkart_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        platform VARCHAR(50),
        title VARCHAR(500),
        description TEXT,
        bullet_points JSONB,
        keywords TEXT[],
        category_path TEXT,
        generated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customer_tryon (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        customer_photo TEXT NOT NULL,
        product_photo TEXT NOT NULL,
        result_images JSONB,
        credits_used INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS plan_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_name VARCHAR(50) UNIQUE NOT NULL,
        credits_per_image INTEGER DEFAULT 1,
        tryon_credits INTEGER DEFAULT 3,
        upscale_credits INTEGER DEFAULT 2,
        max_products INTEGER DEFAULT 100,
        features JSONB,
        price DECIMAL(10,2)
      );

      INSERT INTO plan_settings (plan_name, credits_per_image, tryon_credits, upscale_credits, max_products, features, price)
      VALUES 
        ('basic', 8, 3, 2, 50, '{"angles": 4, "bgRemoval": true, "export": ["amazon","flipkart"]}', 999),
        ('pro', 1, 2, 1, 500, '{"angles": 5, "bgRemoval": true, "export": ["amazon","flipkart","meesho"], "priority": true}', 2999),
        ('enterprise', 1, 1, 1, 9999, '{"angles": 5, "bgRemoval": true, "export": ["all"], "priority": true, "apiAccess": true}', 9999)
      ON CONFLICT (plan_name) DO NOTHING;

      -- Ensure existing installations move Basic plan to 8 credits per generated image.
      UPDATE plan_settings
      SET credits_per_image = 8
      WHERE plan_name = 'basic';
    `);
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export default pool;
