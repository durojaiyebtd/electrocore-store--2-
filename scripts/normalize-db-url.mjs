/**
 * Prints DATABASE_URL with two common gaps filled in, so the URL Coolify shows for its
 * MongoDB ("Mongo URL (internal)", e.g. mongodb://root:PASS@host:27017/?directConnection=true)
 * works as-is:
 *  - no database name in the path  -> uses DB_NAME (default "electrocore")
 *  - credentials but no authSource -> adds authSource=admin (where MongoDB keeps the root user)
 * A URL that already has both is printed unchanged. Used by docker-entrypoint.sh.
 */
const url = process.env.DATABASE_URL ?? '';
const dbName = (process.env.DB_NAME || 'electrocore').trim();

if (!/^mongodb(\+srv)?:\/\//.test(url)) {
  process.stdout.write(url);
  process.exit(0);
}

const schemeEnd = url.indexOf('://') + 3;
const queryStart = url.indexOf('?', schemeEnd);
const beforeQuery = queryStart === -1 ? url : url.slice(0, queryStart);
let query = queryStart === -1 ? '' : url.slice(queryStart + 1);

// The path starts at the first "/" after the credentials (if any) and hosts
const atIndex = beforeQuery.lastIndexOf('@');
const pathStart = beforeQuery.indexOf('/', atIndex === -1 ? schemeEnd : atIndex);
const hosts = pathStart === -1 ? beforeQuery : beforeQuery.slice(0, pathStart);
let path = pathStart === -1 ? '' : beforeQuery.slice(pathStart + 1);

if (!path) path = dbName;

const hasCredentials = atIndex !== -1;
if (hasCredentials && !/(^|&)authSource=/i.test(query)) {
  query = query ? `authSource=admin&${query}` : 'authSource=admin';
}

process.stdout.write(`${hosts}/${path}${query ? `?${query}` : ''}`);
