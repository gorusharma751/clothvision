import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const envExamplePath = path.join(backendRoot, '.env.example');
const envPath = path.join(backendRoot, '.env');

const parseEnvKeys = (content) => {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => line.split('=', 1)[0].trim());
};

if (!fs.existsSync(envExamplePath)) {
  console.warn('Skipping env sync: .env.example not found');
  process.exit(0);
}

const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
const exampleKeys = parseEnvKeys(exampleContent);

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, `${exampleContent.trim()}\n`, 'utf8');
  console.log('Created backend/.env from backend/.env.example');
  process.exit(0);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envKeys = new Set(parseEnvKeys(envContent));

const missingKeys = exampleKeys.filter(key => !envKeys.has(key));
if (!missingKeys.length) {
  process.exit(0);
}

const exampleMap = new Map(
  exampleContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1)];
    })
);

const appendLines = [''];
for (const key of missingKeys) {
  appendLines.push(`${key}=${exampleMap.get(key) ?? ''}`);
}

fs.appendFileSync(envPath, `${appendLines.join('\n')}\n`, 'utf8');
console.log(`Appended ${missingKeys.length} missing env key(s) to backend/.env`);
