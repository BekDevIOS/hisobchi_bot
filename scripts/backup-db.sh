#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${POSTGRES_DB:-hisobchi}"
PGUSER="${POSTGRES_USER:-hisobchi}"

pg_dump --format=custom --file="$BACKUP_DIR/hisobchi-$STAMP.dump" "$PGDATABASE"
echo "Created $BACKUP_DIR/hisobchi-$STAMP.dump"
