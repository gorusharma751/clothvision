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
