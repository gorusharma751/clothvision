import axios from 'axios';
import { buildUploadUrl } from './uploads';

const trimTrailingSlash = (value = '') => String(value).trim().replace(/\/+$/, '');
const envApiBase = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
const isVercelHosted = typeof window !== 'undefined' && /(?:^|\.)vercel\.app$/i.test(window.location.hostname);
const API_BASE_URL = isVercelHosted ? '/api' : (envApiBase || '/api');

const api = axios.create({ baseURL: API_BASE_URL, timeout: 120000 });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cv_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    const requestPath = String(err?.config?.url || '');
    const isLoginRequest = /\/auth\/login(?:\?.*)?$/i.test(requestPath);

    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('cv_token');
      localStorage.removeItem('cv_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const getImageUrl = (storedPath) => buildUploadUrl(storedPath);

export default api;
