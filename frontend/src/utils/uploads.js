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
  const value = String(storedPath).trim();

  // Keep absolute non-local URLs (e.g. Cloudinary) unchanged.
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const pathname = String(parsed.pathname || '').replace(/\\/g, '/');
      const isLocalUploadsPath = pathname.startsWith('/uploads/') || pathname.startsWith('/api/uploads/');
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
