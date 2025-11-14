#!/bin/bash

# Boggle Game Startup Script

echo "🎮 Starting Boggle Multiplayer Game..."
echo ""

# Check if Redis is running
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is installed but not running"
        echo "   Start with: brew services start redis (macOS) or sudo systemctl start redis (Linux)"
        echo "   App will work WITHOUT Redis (using in-memory storage)"
    fi
else
    echo "ℹ️  Redis not installed (optional)"
    echo "   App will work WITHOUT Redis (using in-memory storage)"
fi

echo ""
echo "🚀 Starting server on http://localhost:3001"
echo ""
echo "📝 How to test:"
echo "   1. Open http://localhost:3001 in your browser"
echo "   2. Click 'צור משחק' (Create Game) as HOST"
echo "   3. Enter room name and create room"
echo "   4. Open http://localhost:3001 in another browser/incognito"
echo "   5. Click 'הצטרף למשחק' (Join Game) as PLAYER"
echo "   6. Enter room code and username to join"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""
echo "----------------------------------------"
echo ""

cd "$(dirname "$0")/be"
node server.js
