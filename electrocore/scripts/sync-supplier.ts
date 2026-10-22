/**
 * Pulls the latest catalog, prices and stock from a supplier.
 *
 *   npm run supplier:sync                 uses SUPPLIER_PROVIDER from .env
 *   npm run supplier:sync -- technocrat   a specific supplier
 *   npm run catalog:technocrat            Technocrat JSON + hide the demo products
 *
 * Add --replace-demo to hide the built-in demo products after syncing.
 */
import { prisma } from '../src/lib/prisma';
import { getSupplier } from '../src/lib/suppliers';
import { hideProductsFromSource, syncFromSupplier } from '../src/server/services/sync.service';

async function main() {
  const args = process.argv.slice(2);
  const replaceDemo = args.includes('--replace-demo');
  const supplierArg = args.find((arg) => !arg.startsWith('--'));
  const adapter = getSupplier(supplierArg);

  console.log(`▶ Syncing from supplier: ${adapter.displayName} (${adapter.key})`);
  const report = await syncFromSupplier(adapter);
  console.table({
    'Run ID': report.runId,
    Categories: report.categories,
    'Products created': report.productsCreated,
    'Products updated': report.productsUpdated,
    'Variants created': report.variantsCreated,
    'Variants updated': report.variantsUpdated,
    'Variants deactivated': report.variantsDeactivated,
    'Products hidden (left the feed)': report.productsHidden,
    'Stock changes logged': report.stockChanges,
  });
  if (report.skipped.length > 0) {
    console.warn('Skipped products:', report.skipped);
  }

  if (replaceDemo && adapter.key !== 'mock') {
    const hidden = await hideProductsFromSource('mock');
    console.log(`✓ Hid ${hidden} demo product${hidden === 1 ? '' : 's'}. Re-show any of them from Admin → Products.`);
  }
}

main()
  .catch((error) => {
    console.error('✖ Sync failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
