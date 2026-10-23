#!/bin/sh
# Runs when the container starts: sync the database schema, then start the server.
# The sync only ADDS things (it never passes --accept-data-loss) and is skipped
# when DATABASE_URL is missing or DB_SYNC=off.
set -e
node scripts/db-sync.mjs
exec "$@"
