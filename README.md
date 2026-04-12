# ClothVision AI

AI-powered fashion photography platform — Vertex AI se model try-on, angles, listing content.

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
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_API_KEY=your_vertex_api_key
```

Single file mode use karo: local backend sirf `backend/.env` read karta hai.

`backend/.env` already git-ignored hai, isliye secrets commit mein nahi jayenge.

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
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION` (recommended: `us-central1`)
- `VERTEX_API_KEY`
- `FRONTEND_URL` = your Vercel domain (after frontend deploy)
- Optional: `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`

#### Env behavior

- Local development: backend reads `backend/.env`.
- Live deployment: Railway environment variables should be set in Railway dashboard.
- `backend/.env` stays local because it is git-ignored.

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
