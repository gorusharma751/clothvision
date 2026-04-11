# ClothVision AI

AI-powered fashion photography platform — Gemini se model try-on, angles, listing content.

---

## Windows Setup (Step by Step)

### Step 1 — Prerequisites install karo

1. **Node.js** — https://nodejs.org (LTS version download karo)
2. **PostgreSQL** — https://www.postgresql.org/download/windows/
   - Install karte waqt password yaad rakho (default: postgres)

### Step 2 — Dependencies install karo

Double-click karo: **`setup.bat`**

Ya terminal mein:
```
cd backend
npm install

cd ..\frontend
npm install
```

### Step 3 — Database banao

pgAdmin kholo (PostgreSQL ke saath install hota hai) aur run karo:
```sql
CREATE DATABASE clothvision;
```

Ya `CREATE_DATABASE.bat` double-click karo.

### Step 4 — .env file edit karo

`backend\.env` file mein yeh values set karo:
```
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/clothvision
GEMINI_API_KEY=AIza...your_key_here...
```

Recommended: `backend/.env` ko deployment/shared values ke liye rakho, aur local testing ke liye `backend/.env.local` use karo.

```powershell
cd backend
Copy-Item .env.local.example .env.local
```

Then edit only `backend/.env.local` for local overrides (DB host/password, localhost frontend URL).

**Gemini API key FREE milti hai:** https://aistudio.google.com/app/apikey

### Step 5 — Start karo

**Terminal 1** — double-click `START_BACKEND.bat`

**Terminal 2** — double-click `START_FRONTEND.bat`

Browser mein kholo: **http://localhost:5173**

---

## Login

| Role  | Email                    | Password  |
|-------|--------------------------|-----------|
| Admin | admin@clothvision.com    | Admin@123 |

---

## Features

| Feature | Credits |
|---------|---------|
| AI Try-On (per angle) | 1 cr |
| Customer Try-On | 3 cr |
| Image Upscale (HD) | 2 cr |

---

## Platforms Supported
- **Flipkart:** Front, Back, Left Side, Right Side (4 angles)
- **Amazon:** Front, Back, Left Side, 3/4 Front + Detail (5 angles)

---

## Production Deploy (Vercel)

This repository is configured for deploying the **frontend on Vercel**.

### 1. Deploy backend first (production host)

Deploy the `backend/` app to any Node host (Render/Railway/Fly/etc.) and set:

- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `FRONTEND_URL` = your Vercel domain (after frontend deploy)

#### File-based env mode (no manual Railway variables)

If you want Railway to run from repo env files only:

- Keep all keys in `backend/.env.example` (canonical key list)
- Keep real values in `backend/.env`
- Commit `backend/.env` so Railway deploy can read it at runtime
- `backend/scripts/ensure-env.js` auto-adds any missing keys from `.env.example` into `.env` during `npm start` / `npm run dev`

#### Local overrides without breaking live deploy

- Backend now loads env in this order:
   - `backend/.env`
   - `backend/.env.local` (only when NODE_ENV is not production, and this file overrides `.env`)
- `backend/.env.local` is git-ignored, so local DB/frontend settings stay local.
- Use `backend/.env.local.example` as template.

Note: committing `.env` stores secrets in git history. Use only in private repos you control.

### 2. Configure Vercel frontend env vars

Use values from `frontend/.env.production.example`:

- `VITE_API_BASE_URL=https://your-backend-domain.com/api`
- `VITE_UPLOADS_BASE_URL=https://your-backend-domain.com`

### 3. Deploy this repo to Vercel

- Import this GitHub repo in Vercel
- Set **Root Directory** to `frontend`
- `frontend/vercel.json` is the canonical config file for SPA rewrites
- Add the two `VITE_*` env vars
- Deploy

After deploy, Vercel gives your live URL automatically.

### Troubleshooting: `Cannot GET /`

If your deployed URL shows `Cannot GET /`:

- Confirm Vercel project **Root Directory** is exactly `frontend` (not `backend`)
- If Vercel keeps old root settings, update in `Project Settings -> General -> Root Directory`
- If root directory change is not available for the existing project, create a new Vercel project from same repo and choose `frontend` during import
- Redeploy after saving config changes.
- Verify these URLs:
  - `https://your-domain.vercel.app/` should load app
  - `https://your-backend-domain.com/api/health` should return JSON health status
