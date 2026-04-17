import pg from 'pg';
import './loadEnv.js';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '').trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Use backend/.env.local for development or backend/.env for production.');
}

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
  const connectionLabel = (() => {
    try {
      const parsed = new URL(databaseUrl);
      return `${parsed.protocol}//${parsed.username || '(no-user)'}:***@${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
    } catch {
      return databaseUrl;
    }
  })();

  if (/ENOTFOUND/i.test(raw)) {
    try {
      const parsed = new URL(databaseUrl);
      return new Error(
        `Cannot resolve database host "${parsed.hostname}". Verify DATABASE_URL is correct and reachable from this runtime. If using Heroku Postgres, copy the exact DATABASE_URL from Heroku Config Vars.`
      );
    } catch {
      return new Error(
        'Cannot resolve database host from DATABASE_URL. Verify the host is valid and reachable from this runtime.'
      );
    }
  }

  if (/password authentication failed for user/i.test(raw)) {
    try {
      const parsed = new URL(databaseUrl);
      const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (isLocalHost) {
        return new Error(
          `Postgres password authentication failed for local user "${parsed.username}". Update DATABASE_URL in backend/.env.local with your actual PostgreSQL password. Current URL: ${connectionLabel}`
        );
      }
    } catch {
      // Fall through to generic auth error.
    }

    return new Error(`Postgres authentication failed for DATABASE_URL. Verify username/password. Current URL: ${connectionLabel}`);
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
export const getDbClient = () => pool.connect();

export const initDB = async () => {
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

      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        input JSONB NOT NULL,
        result JSONB,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_user_created_at ON jobs(user_id, created_at DESC);

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

      CREATE TABLE IF NOT EXISTS video_generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        video_type VARCHAR(50),
        script JSONB,
        frames JSONB,
        credits_used INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS label_generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        product_image TEXT,
        config JSONB,
        result_url TEXT,
        credits_used INTEGER DEFAULT 2,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(100) NOT NULL,
        key VARCHAR(200) NOT NULL,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(category, key)
      );

      CREATE TABLE IF NOT EXISTS scene_builds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        product_image TEXT,
        background_image TEXT,
        config JSONB,
        result_images JSONB,
        credits_used INTEGER DEFAULT 2,
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

      INSERT INTO admin_settings (category, key, value, description)
      VALUES
        ('image_prompts', 'color_preservation', 'CRITICAL: Product color must be 100% identical to input. No color shift allowed.', 'Color preservation instruction'),
        ('image_prompts', 'face_preservation', 'Face must be 100% identical - same features, skin tone, eyes, nose, lips.', 'Face preservation instruction'),
        ('image_prompts', 'quality_standard', 'High resolution, sharp, professional photography quality.', 'Quality standard'),
        ('video_prompts', 'showcase_extra', 'Smooth camera movement, professional lighting, premium feel.', 'Showcase video extra prompt'),
        ('video_prompts', 'lifestyle_extra', 'Trendy, social media ready, vibrant colors.', 'Lifestyle video extra prompt'),
        ('credits', 'tryon_cost', '1', 'Credits per try-on image'),
        ('credits', 'video_script_cost', '5', 'Credits for video script + frames'),
        ('credits', 'label_cost', '2', 'Credits for label generation'),
        ('credits', 'scene_cost', '2', 'Credits for scene builder'),
        ('credits', 'view360_cost', '4', 'Credits for 360 view (4 images)')
      ON CONFLICT (category, key) DO NOTHING;
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
