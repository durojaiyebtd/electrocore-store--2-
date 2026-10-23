/**
 * Runs automatically before every build (see "build" in package.json).
 * It makes your database match prisma/schema.prisma by running `prisma db push`.
 *
 * Safe by design:
 * - It only ADDS things (new fields, collections, indexes). It never passes
 *   --accept-data-loss, so Prisma refuses any change that could delete data.
 * - If DATABASE_URL is not set (for example a build with no database), it skips with a warning.
 * - If the push fails, the build stops, so a half-updated site is never published and
 *   the previous version of the site keeps running.
 * - Set DB_SYNC=off in your environment variables to switch it off.
 */
import { spawnSync } from 'node:child_process';

if (process.env.DB_SYNC === 'off') {
  console.log('[db-sync] DB_SYNC=off, skipping the database update.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.warn('[db-sync] DATABASE_URL is not set, so the database was NOT updated. Add DATABASE_URL in your hosting environment variables.');
  process.exit(0);
}

console.log('[db-sync] Updating the database to match the schema…');
const result = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });

if (result.status !== 0) {
  console.error('\n[db-sync] The database update failed, so the build was stopped. Your live site is unchanged.');
  console.error('[db-sync] Check that DATABASE_URL is correct and that your MongoDB Atlas "Network Access" allows connections from anywhere (0.0.0.0/0).');
  process.exit(result.status ?? 1);
}
console.log('[db-sync] Database is up to date.');
