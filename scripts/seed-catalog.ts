/**
 * Loads the product catalog on first start, and ONLY the catalog.
 *
 * Unlike scripts/seed.ts it never creates a default admin account (that one uses a well-known
 * password, which must never exist on a live site). The admin comes from ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * It does nothing when the store already has products, so it never overwrites prices or stock the
 * team has edited in the admin portal. Set SEED_CATALOG=off to switch it off.
 * To reload or refresh the catalog on purpose, use Admin → Settings → supplier sync, or `npm run db:seed`.
 */
import { prisma } from '../src/lib/prisma';
import { getSupplier } from '../src/lib/suppliers';
import { hideProductsFromSource, syncFromSupplier } from '../src/server/services/sync.service';

async function main() {
  if ((process.env.SEED_CATALOG ?? '').toLowerCase() === 'off') {
    console.log('[catalog] SEED_CATALOG=off, skipping.');
    return;
  }
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`[catalog] ${existing} products already in the store, leaving them untouched.`);
    return;
  }
  const adapter = getSupplier(process.env.SUPPLIER_PROVIDER ?? 'technocrat');
  console.log(`[catalog] Store is empty. Loading the catalog from: ${adapter.displayName}`);
  const report = await syncFromSupplier(adapter);
  console.log(`[catalog] Loaded ${report.categories} categories and ${report.productsCreated} products (${report.variantsCreated} variants).`);
  if (report.skipped.length > 0) console.warn('[catalog] Skipped:', report.skipped);
  if (adapter.key !== 'mock') await hideProductsFromSource('mock');
}

main()
  .catch((error) => {
    console.error('[catalog] Could not load the catalog:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
