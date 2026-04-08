@echo off
echo Creating ClothVision database...
echo.
echo Make sure PostgreSQL is running and psql is in your PATH
echo.
psql -U postgres -c "CREATE DATABASE clothvision;"
if %errorlevel% neq 0 (
    echo.
    echo If above failed, open pgAdmin or psql manually and run:
    echo CREATE DATABASE clothvision;
)
echo.
pause
