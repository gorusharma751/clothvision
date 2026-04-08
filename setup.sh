#!/bin/bash
echo "======================================="
echo "  ClothVision AI — Setup Script"
echo "======================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install Node.js 18+ from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "⚠️  PostgreSQL not found locally. Using Docker? Skip this check."
else
  echo "✅ PostgreSQL found"
fi

echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install
echo "✅ Backend ready"

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install
echo "✅ Frontend ready"

echo ""
echo "======================================="
echo "  NEXT STEPS:"
echo "======================================="
echo "1. Create PostgreSQL database:"
echo "   createdb clothvision"
echo ""
echo "2. Copy and edit .env file:"
echo "   cp backend/.env.example backend/.env"
echo "   # Add your GEMINI_API_KEY"
echo ""
echo "3. Start backend (terminal 1):"
echo "   cd backend && npm run dev"
echo ""
echo "4. Start frontend (terminal 2):"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Open http://localhost:5173"
echo "   Admin login: admin@clothvision.com / Admin@123"
echo ""
echo "🔑 Get Gemini API key: https://aistudio.google.com/app/apikey"
