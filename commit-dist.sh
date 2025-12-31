#!/bin/bash
set -e

cd /Users/james/Sites/published/gluecraft

echo "=== Current directory ==="
pwd

echo ""
echo "=== Git status for dist/ ==="
git status dist/

echo ""
echo "=== Adding dist files ==="
git add dist/index.js dist/cli.js

echo ""
echo "=== Committing ==="
git commit -m "fix: commit rebuilt CJS dist files" || echo "Nothing to commit"

echo ""
echo "=== Pushing to origin main ==="
git push origin main

echo ""
echo "=== Done! ==="

