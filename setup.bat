@echo off
echo =======================================
echo   ClothVision AI - Windows Setup
echo =======================================
echo.

:: Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found
node -v

echo.
echo [1/2] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend install failed
    pause
    exit /b 1
)
echo [OK] Backend ready

echo.
echo [2/2] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend install failed
    pause
    exit /b 1
)
echo [OK] Frontend ready

cd ..
echo.
echo =======================================
echo   SETUP COMPLETE!
echo =======================================
echo.
echo NEXT STEPS:
echo.
echo 1. Make sure PostgreSQL is running
echo    (Or use: https://www.postgresql.org/download/windows/)
echo.
echo 2. Create database (in psql or pgAdmin):
echo    CREATE DATABASE clothvision;
echo.
echo 3. Edit backend\.env file:
echo    - Add your GEMINI_API_KEY
echo    - Update DATABASE_URL if needed
echo.
echo 4. Open TWO terminals:
echo.
echo    Terminal 1 (Backend):
echo    cd backend
echo    npm run dev
echo.
echo    Terminal 2 (Frontend):
echo    cd frontend
echo    npm run dev
echo.
echo 5. Open browser: http://localhost:5173
echo    Admin: admin@clothvision.com / Admin@123
echo.
echo Get Gemini API key (FREE):
echo https://aistudio.google.com/app/apikey
echo.
pause
