#!/bin/sh
# Runs when the container starts: sync the database schema, then start the server.
# The sync only ADDS things (it never passes --accept-data-loss) and is skipped
# when DATABASE_URL is missing or DB_SYNC=off.
set -e

# Accept Coolify's internal Mongo URL as-is: add the database name / authSource if missing.
if [ -n "$DATABASE_URL" ]; then
  DATABASE_URL="$(node scripts/normalize-db-url.mjs)"
  export DATABASE_URL
fi

node scripts/db-sync.mjs

# Admin account from the host's environment variables (ADMIN_EMAIL + ADMIN_PASSWORD).
# A failure here is reported but never stops the site from starting.
if [ -n "$ADMIN_EMAIL" ] && [ -n "$DATABASE_URL" ]; then
  echo "[admin] Ensuring $ADMIN_EMAIL is an admin..."
  npx tsx scripts/seed-admin.ts || echo "[admin] Could not set up the admin account (see the message above)."
fi

# First start only: load the product catalog when the store has no products yet.
# Never creates a default admin and never touches existing products. A failure is reported
# but never stops the site from starting. Set SEED_CATALOG=off to disable.
if [ -n "$DATABASE_URL" ]; then
  npx tsx scripts/seed-catalog.ts || echo "[catalog] Could not load the catalog (see the message above)."
fi

exec "$@"
