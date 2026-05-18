#!/bin/bash

# Quick start script for OpenNebula Docker & Kubernetes addons
# Run this first to set everything up

echo "================================================"
echo "OpenNebula Addons - Quick Start Setup"
echo "================================================"
echo ""

# Create addon directory
ADDON_DIR="${HOME}/.opennebula/addons"
echo "[*] Creating addon directory: $ADDON_DIR"
mkdir -p "$ADDON_DIR"

# Set environment variable for the UI
echo "[*] Setting up environment..."
export ADDONS_DIR="$ADDON_DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Node.js is not installed. Please install Node.js first."
    echo "    Ubuntu/Debian: sudo apt install -y nodejs npm"
    echo "    macOS: brew install node"
    exit 1
fi

echo "[✓] Node.js: $(node --version)"
echo "[✓] npm: $(npm --version)"

# Install dependencies if needed
echo ""
echo "[*] Checking client dependencies..."
if [ ! -d "client/node_modules" ]; then
    echo "[*] Installing client dependencies..."
    cd client && npm install && cd ..
fi

echo "[*] Checking server dependencies..."
if [ ! -d "server/node_modules" ]; then
    echo "[*] Installing server dependencies..."
    cd server && npm install && cd ..
fi

echo ""
echo "[✓] Setup complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the backend server (in terminal 1):"
echo "   cd server && npm start"
echo ""
echo "2. Start the frontend (in terminal 2):"
echo "   cd client && npm run dev"
echo ""
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "4. Navigate to the Addons page and install Docker/Kubernetes"
echo ""
echo "5. For system-level installation of Docker and OneKE, run:"
echo "   bash install-addons.sh"
echo ""
echo "================================================"
