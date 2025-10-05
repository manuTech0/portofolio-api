#!/bin/sh
set -e

# Tunggu database siap (opsional)
if [ -n "$DATABASE_URL" ]; then
  echo "Running Prisma migrations..."
  bun run build
else
  echo "DATABASE_URL not set. Skipping migrations."
fi

# Jalankan aplikasi
exec "$@"
