#!/usr/bin/env bash
# Deploy to Railway using local Docker build (leverages layer cache)
# Usage: ./scripts/deploy.sh [--no-cache]

set -euo pipefail

cd "$(dirname "$0")/.."

NO_CACHE=""
if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
  echo "Building without cache..."
fi

echo "==> Building Docker image locally (cached layers reused)..."
docker build $NO_CACHE -t lexiclash:latest -f Dockerfile .

echo "==> Deploying to Railway..."
cd ..
railway up

echo "==> Done! Check status: railway status"
