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

exec "$@"
