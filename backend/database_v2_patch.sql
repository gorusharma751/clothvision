-- ADD these tables inside initDB() in database.js

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

-- Default admin settings
INSERT INTO admin_settings (category, key, value, description) VALUES
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
