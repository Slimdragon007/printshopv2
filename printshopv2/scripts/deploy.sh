#!/usr/bin/env bash
set -euo pipefail

# Deploy flow: commit -> create/push GitHub repo -> deploy to Vercel

echo "[deploy] Checking prerequisites..."
command -v vercel >/dev/null 2>&1 || { echo "Error: vercel CLI not found. Run: npm i -D vercel"; exit 1; }

BRANCH=${BRANCH:-main}

echo "[deploy] Ensuring git repo and branch..."
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
fi

current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -z "$current_branch" ] || [ "$current_branch" = "HEAD" ]; then
  git checkout -B "$BRANCH"
else
  git branch -M "$BRANCH"
fi

echo "[deploy] Committing current changes..."
git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore: initial push + vercel config"
fi

echo "[deploy] Creating/pushing GitHub repo (if gh available)..."
if command -v gh >/dev/null 2>&1; then
  # Create repo if no origin remote
  if ! git remote get-url origin >/dev/null 2>&1; then
    gh repo create --source=. --public --push || true
  fi
fi

# Push to origin if configured
if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin "$BRANCH"
else
  echo "[deploy] Skipping push: no 'origin' remote set. Use 'gh repo create' or 'git remote add origin <url>'."
fi

echo "[deploy] Deploying to Vercel (prod)..."
# If not linked/logged-in, this may prompt. Pre-link with: vercel link
vercel --prod --yes

echo "[deploy] Done."
