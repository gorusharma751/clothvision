-- Run this migration on existing database:
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id);
-- superadmin role addition handled by creating first superadmin manually
