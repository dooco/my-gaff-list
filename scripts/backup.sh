#!/bin/bash
set -e

# My-Gaff-List Backup Script
# Usage: ./scripts/backup.sh [--db-only] [--media-only]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/my-gaff-list}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${RETENTION_DAYS:-7}

DB_ONLY=false
MEDIA_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --db-only)
      DB_ONLY=true
      shift
      ;;
    --media-only)
      MEDIA_ONLY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

mkdir -p "$BACKUP_DIR"

echo "📦 My-Gaff-List Backup"
echo "   Backup directory: $BACKUP_DIR"
echo "   Retention: $RETENTION_DAYS days"
echo ""

# Check if containers are running
if ! docker compose -f docker-compose.prod.yml ps --status running | grep -q "db"; then
  echo "❌ Error: Database container is not running"
  echo "   Start services first: docker compose -f docker-compose.prod.yml up -d"
  exit 1
fi

# Database backup
if [ "$MEDIA_ONLY" = false ]; then
  echo "🗃️  Creating database backup..."
  DB_FILE="$BACKUP_DIR/db_$DATE.sql"
  
  docker compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U mygafflist mygafflist > "$DB_FILE"
  
  # Compress
  gzip "$DB_FILE"
  DB_FILE="$DB_FILE.gz"
  
  DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
  echo "   ✓ Database backup: $DB_FILE ($DB_SIZE)"
fi

# Media backup
if [ "$DB_ONLY" = false ]; then
  echo "📁 Creating media backup..."
  MEDIA_FILE="$BACKUP_DIR/media_$DATE.tar.gz"
  
  # Check if media volume exists and has content
  if docker compose -f docker-compose.prod.yml exec -T backend test -d /app/media 2>/dev/null; then
    docker compose -f docker-compose.prod.yml exec -T backend \
      tar czf - -C /app media 2>/dev/null > "$MEDIA_FILE" || true
    
    if [ -s "$MEDIA_FILE" ]; then
      MEDIA_SIZE=$(du -h "$MEDIA_FILE" | cut -f1)
      echo "   ✓ Media backup: $MEDIA_FILE ($MEDIA_SIZE)"
    else
      rm -f "$MEDIA_FILE"
      echo "   ℹ No media files to backup"
    fi
  else
    echo "   ℹ No media directory found"
  fi
fi

# Cleanup old backups
echo ""
echo "🧹 Cleaning up old backups (>$RETENTION_DAYS days)..."
DELETED_DB=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
DELETED_MEDIA=$(find "$BACKUP_DIR" -name "media_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "   Deleted: $DELETED_DB database, $DELETED_MEDIA media backups"

# Summary
echo ""
echo "📋 Current backups:"
ls -lh "$BACKUP_DIR"/ 2>/dev/null | tail -10

echo ""
echo "✅ Backup complete!"
echo ""
echo "🔄 To restore database:"
echo "   gunzip -c $BACKUP_DIR/db_YYYYMMDD_HHMMSS.sql.gz | \\"
echo "     docker compose -f docker-compose.prod.yml exec -T db psql -U mygafflist mygafflist"
echo ""
echo "💡 Add to crontab for daily backups:"
echo "   0 3 * * * cd $PROJECT_DIR && ./scripts/backup.sh >> /var/log/mygafflist-backup.log 2>&1"
