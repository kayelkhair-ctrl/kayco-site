#!/bin/bash
# ============================================================
# Kay & Co., deploy script
# Commits all changes and pushes to main. Cloudflare Pages
# (connected to this repo) rebuilds automatically on push.
# ============================================================
set -e

git add .
git commit -m "Auto-update: $(date '+%Y-%m-%d %H:%M')"
git push origin main
echo "Deployed. Cloudflare Pages will update in ~60 seconds."
