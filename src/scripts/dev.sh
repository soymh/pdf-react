#!/bin/bash

# PDF Workspace - Cyberpunk Edition
# Development Server Startup Script

echo "⚡ Starting PDF Workspace - Cyberpunk Edition ⚡"
echo ""
echo "🚀 Initializing development environment..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the development server
echo "🔥 Starting Vite development server..."
echo "🌐 Open http://localhost:5173 in your browser"
echo ""
echo "Features available:"
echo "  • PDF viewing and snippet capture"
echo "  • AI-powered image upscaling"
echo "  • Advanced layout editor"
echo "  • Workspace management"
echo "  • Real PDF export"
echo ""

npm run dev