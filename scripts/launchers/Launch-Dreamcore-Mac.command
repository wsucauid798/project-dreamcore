#!/bin/bash
# Project root is two levels up from scripts/launchers/.
cd "$(dirname "$0")/../.." || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js is not installed."
  echo "Download it from https://nodejs.org and re-run this file."
  echo
  read -n 1 -s -r -p "Press any key to exit..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (first run only)..."
  npm install || { echo; echo "Install failed."; read -n 1 -s -r -p "Press any key to exit..."; exit 1; }
fi

echo "Building the app..."
npm run build || { echo; echo "Build failed."; read -n 1 -s -r -p "Press any key to exit..."; exit 1; }

echo
node server.mjs
