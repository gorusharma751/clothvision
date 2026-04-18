-- ClothVision SaaS Tables -- add inside initDB() in database.js

CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  credits_monthly INTEGER DEFAULT 100,
  max_users INTEGER DEFAULT 5,
  max_products INTEGER DEFAULT 100,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  plan_id UUID REFERENCES saas_plans(id),
  status VARCHAR(20) DEFAULT 'trial',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(5) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  transaction_ref VARCHAR(200),
  description TEXT,
  plan_id UUID REFERENCES saas_plans(id),
  credits_added INTEGER DEFAULT 0,
  screenshot_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  value TEXT,
  UNIQUE(admin_id, feature_key)
);

CREATE TABLE IF NOT EXISTS super_admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(200) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(100) DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO saas_plans (name,slug,description,price_monthly,price_yearly,credits_monthly,max_users,max_products,features,sort_order) VALUES
  ('Starter','starter','For small shops',999,8999,200,2,50,'["fashion_tryon","bg_generator","listing_content"]',1),
  ('Professional','professional','For growing brands',2499,22999,800,5,500,'["fashion_tryon","bg_generator","scene_builder","listing_content","360_view","label_creator","video_studio"]',2),
  ('Business','business','For established sellers',4999,44999,2500,15,2000,'["all_features","priority_support","customer_tryon","marketing_studio"]',3),
  ('Enterprise','enterprise','Custom for large teams',0,0,10000,100,99999,'["all_features","dedicated_support","white_label","sla"]',4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO super_admin_settings (key,value,category,description) VALUES
  ('platform_name','ClothVision AI','branding','Platform name'),
  ('support_email','support@clothvision.ai','general','Support email'),
  ('trial_days','7','subscription','Free trial days'),
  ('trial_credits','50','subscription','Trial credits'),
  ('upi_id','','payment','UPI ID'),
  ('bank_name','','payment','Bank name'),
  ('account_number','','payment','Account number'),
  ('ifsc_code','','payment','IFSC code'),
  ('credit_cost_inr','0.5','pricing','Cost per credit INR'),
  ('min_credit_purchase','100','pricing','Min credits purchase')
ON CONFLICT (key) DO NOTHING;
