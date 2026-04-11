import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');

// Load repository/shared defaults first.
dotenv.config({ path: envPath });

// In non-production, allow local developer overrides without touching shared .env.
const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
if (!isProduction && fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}
