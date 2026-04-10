const trimTrailingSlash = (value = '') => String(value).trim().replace(/\/+$/, '');

const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
const UPLOADS_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_UPLOADS_BASE_URL || (API_BASE_URL ? API_BASE_URL.replace(/\/api$/, '') : '')
);

const normalizeRelativeUploadPath = (storedPath = '') => {
  if (!storedPath) return '';
  const normalized = String(storedPath).replace(/\\/g, '/');
  const marker = '/uploads/';
  const idx = normalized.indexOf(marker);
  if (idx >= 0) return normalized.slice(idx + marker.length);
  return normalized.replace(/^\.?\/?uploads\//, '').replace(/^\.?\//, '');
};

export const buildUploadUrl = (storedPath) => {
  if (!storedPath) return null;
  const value = String(storedPath);
  if (/^https?:\/\//i.test(value) && !/\/uploads\//i.test(value)) return value;
  const rel = normalizeRelativeUploadPath(storedPath);
  const token = localStorage.getItem('cv_token');
  const base = `${UPLOADS_BASE_URL}/uploads/${rel}`;
  if (!token) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}`;
};
