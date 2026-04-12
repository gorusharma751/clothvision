import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');
const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

// In development, backend/.env should win over stale shell variables.
dotenv.config({ path: envPath, override: !isProduction });

// Optional local override file for non-production environments.
if (!isProduction) {
	dotenv.config({ path: envLocalPath, override: true });
}
