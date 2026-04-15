import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
const envFileName = isProduction ? '.env' : '.env.local';
const envPath = path.join(__dirname, envFileName);

// Load only one env file based on runtime mode.
// Existing process.env values (e.g., Heroku config vars) are preserved.
dotenv.config({ path: envPath });
