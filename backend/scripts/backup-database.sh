#!/bin/bash
# Backup the database before data reset
# Usage: bash backup-database.sh

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="../prisma/backups"
BACKUP_FILE="${BACKUP_DIR}/before-data-reset-${TIMESTAMP}.sql"

# Source DATABASE_URL from .env
source <(grep DATABASE_URL .env | sed 's/DATABASE_URL=//; s/"//g')

# Parse MySQL URL: mysql://user:pass@host:port/dbname
URL="${DATABASE_URL%%\?*}"
USER=$(echo "$URL" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
PASS=$(echo "$URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1' | python3 -c "import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))")
HOST=$(echo "$URL" | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
PORT=$(echo "$URL" | sed -n 's|mysql://[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')
DBNAME=$(echo "$URL" | sed -n 's|mysql://[^@]*@[^:]*:[0-9]*/\([^?]*\).*|\1|p')

echo "=== Database Backup ==="
echo "Host: $HOST:$PORT"
echo "Database: $DBNAME"
echo "User: $USER"
echo "Output: $BACKUP_FILE"
echo ""

mkdir -p "$BACKUP_DIR"

mysqldump \
  -h "$HOST" \
  -P "$PORT" \
  -u "$USER" \
  -p"$PASS" \
  --single-transaction \
  --quick \
  --lock-tables=false \
  --no-create-info \
  --complete-insert \
  "$DBNAME" \
  > "$BACKUP_FILE" 2>/dev/null

FILE_SIZE=$(wc -c < "$BACKUP_FILE" | tr -d ' ')
LINE_COUNT=$(wc -l < "$BACKUP_FILE" | tr -d ' ')

echo "Backup complete!"
echo "File: $BACKUP_FILE"
echo "Size: $FILE_SIZE bytes"
echo "Lines: $LINE_COUNT"
