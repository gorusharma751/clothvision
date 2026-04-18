// Run: node create_superadmin.js
// Creates the first super admin user

import bcrypt from 'bcryptjs';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const email = process.env.ADMIN_EMAIL || 'admin@clothvision.ai';
const password = process.env.ADMIN_PASSWORD || 'Admin@123';
const name = 'Super Admin';

async function createSuperAdmin() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id,role FROM users WHERE email=$1', [email]);
    if (existing.rows.length) {
      await client.query('UPDATE users SET role=$1 WHERE email=$2', ['superadmin', email]);
      console.log(`✅ Updated ${email} to superadmin role`);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      await client.query('INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4)', [email, hashed, name, 'superadmin']);
      console.log(`✅ Created superadmin: ${email}`);
    }
  } finally { client.release(); await pool.end(); }
}

createSuperAdmin().catch(console.error);
