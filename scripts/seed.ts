/**
 * Seeds the database with your catalog and an admin account.
 * Run with:  npm run db:seed
 *
 * The catalog comes from SUPPLIER_PROVIDER in .env:
 *   "technocrat" (default) — src/data/products.json
 *   "mock"                 — the built-in demo catalog
 *   "http"                 — an external wholesale API
 * When a real catalog is loaded, any demo products are hidden.
 *
 * Safe to run more than once — records are upserted, not duplicated.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { getSupplier } from '../src/lib/suppliers';
import { hideProductsFromSource, syncFromSupplier } from '../src/server/services/sync.service';

async function main() {
  const adapter = getSupplier(process.env.SUPPLIER_PROVIDER ?? 'technocrat');
  console.log(`▶ Seeding MAGNIFICENT ELECTROCORE SYNERGY LTD catalog from: ${adapter.displayName}`);
  const report = await syncFromSupplier(adapter);
  console.log(
    `  ✓ ${report.categories} categories, ${report.productsCreated} products created, ${report.productsUpdated} updated, ` +
      `${report.variantsCreated + report.variantsUpdated} variants`,
  );
  if (report.productsHidden > 0) {
    console.log(`  ✓ Hid ${report.productsHidden} product(s) that are no longer in the catalog`);
  }
  if (report.skipped.length > 0) {
    console.warn('  ! Skipped:', report.skipped);
  }

  if (adapter.key !== 'mock') {
    const hidden = await hideProductsFromSource('mock');
    if (hidden > 0) console.log(`  ✓ Hid ${hidden} demo products so only your catalog shows in the store`);
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@electrocore.local').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        firstName: 'Store',
        lastName: 'Administrator',
        role: 'ADMIN',
      },
    });
    console.log(`  ✓ Admin user created: ${adminEmail} — sign in on the store (header → Sign In), then open Admin Portal`);
  } else {
    console.log(`  • Admin user already exists: ${adminEmail}`);
  }

  console.log('✔ Seed complete.');
}

main()
  .catch((error) => {
    console.error('✖ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
