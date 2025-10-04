#!/bin/sh
set -e

# Tunggu database siap (opsional)
if [ -n "$DATABASE_URL" ]; then
  echo "Running Prisma migrations..."
  node_modules/.bin/prisma migrate deploy
else
  echo "DATABASE_URL not set. Skipping migrations."
fi

# Jalankan aplikasi
exec "$@"
