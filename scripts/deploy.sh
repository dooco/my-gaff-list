#!/bin/bash
set -e

# My-Gaff-List Deployment Script
# Usage: ./scripts/deploy.sh [--no-migrate] [--quick]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

NO_MIGRATE=false
QUICK=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-migrate)
      NO_MIGRATE=true
      shift
      ;;
    --quick)
      QUICK=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "🚀 Deploying My-Gaff-List..."
echo "   Project: $PROJECT_DIR"
echo ""

# Check for .env.production
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production not found"
  echo "   Copy .env.production.example and configure it first"
  exit 1
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

if [ "$QUICK" = true ]; then
  echo "⚡ Quick restart (no rebuild)..."
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d
else
  # Build and restart
  echo "🔨 Building containers..."
  docker compose -f docker-compose.prod.yml --env-file .env.production build

  echo "🔄 Starting services..."
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d
fi

# Wait for backend to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Run migrations
if [ "$NO_MIGRATE" = false ]; then
  echo "🗃️  Running database migrations..."
  docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput
fi

# Collect static files
echo "📦 Collecting static files..."
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput 2>/dev/null || true

# Show status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 Useful commands:"
echo "   View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Backend logs: docker compose -f docker-compose.prod.yml logs -f backend"
echo "   Stop:         docker compose -f docker-compose.prod.yml down"
