const trimTrailingSlash = (value = '') => String(value).trim().replace(/\/+$/, '');

const DEFAULT_API_ORIGIN = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://safe-brushlands-32295-ffca10cd1c59.herokuapp.com';
const API_ORIGIN = trimTrailingSlash(import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN);
const UPLOADS_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_UPLOADS_BASE_URL || API_ORIGIN
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
  const value = String(storedPath).trim();

  // Keep absolute non-local URLs (e.g. Cloudinary) unchanged.
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const pathname = String(parsed.pathname || '').replace(/\\/g, '/');
      const isLocalUploadsPath = pathname.startsWith('/uploads/');
      if (!isLocalUploadsPath) return value;
    } catch {
      return value;
    }
  }

  const rel = normalizeRelativeUploadPath(storedPath);
  const token = localStorage.getItem('cv_token');
  const base = `${UPLOADS_BASE_URL}/uploads/${rel}`;
  if (!token) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}`;
};
