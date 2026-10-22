/**
 * Supplier -> database synchronisation.
 * Upserts categories, products and variants from any SupplierAdapter and writes
 * an InventoryLog entry whenever a variant's stock level changes.
 */
import type { FulfillmentType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BASE_CURRENCY, convertMinor } from '@/lib/currency';
import { randomCode } from '@/lib/ids';
import type { SupplierAdapter, SupplierProduct } from '@/lib/suppliers';

export interface SyncReport {
  supplier: string;
  runId: string;
  categories: number;
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  variantsDeactivated: number;
  /** Products from this supplier that are no longer in its feed and were hidden from the store. */
  productsHidden: number;
  stockChanges: number;
  skipped: Array<{ externalId: string; reason: string }>;
}

function buildSearchText(product: SupplierProduct, categoryName: string): string {
  return [product.name, product.brand, categoryName, product.shortDescription, ...product.tags, ...product.variants.map((v) => v.sku)]
    .join(' ')
    .toLowerCase();
}

export async function syncFromSupplier(adapter: SupplierAdapter): Promise<SyncReport> {
  const runId = `SYNC-${adapter.key.toUpperCase()}-${randomCode(6)}`;
  const report: SyncReport = {
    supplier: adapter.key,
    runId,
    categories: 0,
    productsCreated: 0,
    productsUpdated: 0,
    variantsCreated: 0,
    variantsUpdated: 0,
    variantsDeactivated: 0,
    productsHidden: 0,
    stockChanges: 0,
    skipped: [],
  };

  // 1. Categories
  const categories = await adapter.fetchCategories();
  const categoryIdBySlug = new Map<string, { id: string; name: string }>();
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
      update: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
    });
    categoryIdBySlug.set(saved.slug, { id: saved.id, name: saved.name });
    report.categories += 1;
  }

  // 2. Products + variants
  const products = await adapter.fetchProducts();
  const now = new Date();

  const seenExternalIds: string[] = [];

  for (const item of products) {
    const category = categoryIdBySlug.get(item.categorySlug);
    if (!category) {
      report.skipped.push({ externalId: item.externalId, reason: `Unknown category "${item.categorySlug}"` });
      continue;
    }
    if (item.variants.length === 0) {
      report.skipped.push({ externalId: item.externalId, reason: 'Product has no variants' });
      continue;
    }

    seenExternalIds.push(item.externalId);

    // Convert supplier prices into the base currency (NGN kobo)
    const variants = item.variants.map((variant) => ({
      ...variant,
      price: convertMinor(variant.price, item.currency, BASE_CURRENCY),
      compareAtPrice: variant.compareAtPrice ? convertMinor(variant.compareAtPrice, item.currency, BASE_CURRENCY) : null,
    }));
    const cheapest = variants.reduce((min, v) => (v.price < min.price ? v : min), variants[0]);
    const totalStock = variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);

    const productData = {
      name: item.name,
      brand: item.brand,
      shortDescription: item.shortDescription,
      description: item.description,
      images: item.images,
      specs: item.specs,
      tags: item.tags,
      searchText: buildSearchText(item, category.name),
      price: cheapest.price,
      compareAtPrice: cheapest.compareAtPrice,
      currency: BASE_CURRENCY,
      totalStock,
      fulfillment: item.fulfillment as FulfillmentType,
      warrantyMonths: item.warrantyMonths,
      rating: item.rating,
      reviewCount: item.reviewCount,
      featured: item.featured,
      isActive: true,
      lastSyncedAt: now,
      category: { connect: { id: category.id } },
    } satisfies Omit<Prisma.ProductCreateInput, 'slug' | 'source' | 'externalId'>;

    const existing = await prisma.product.findUnique({
      where: { source_externalId: { source: adapter.key, externalId: item.externalId } },
      select: { id: true },
    });

    let productId: string;
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: productData });
      productId = existing.id;
      report.productsUpdated += 1;
    } else {
      // Avoid slug collisions with products from other suppliers
      const slugTaken = await prisma.product.findUnique({ where: { slug: item.slug }, select: { id: true } });
      const slug = slugTaken ? `${item.slug}-${randomCode(4).toLowerCase()}` : item.slug;
      const created = await prisma.product.create({
        data: { ...productData, slug, source: adapter.key, externalId: item.externalId },
      });
      productId = created.id;
      report.productsCreated += 1;
    }

    const seenSkus: string[] = [];
    for (const variant of variants) {
      seenSkus.push(variant.sku);
      const current = await prisma.productVariant.findUnique({ where: { sku: variant.sku } });
      const variantData = {
        externalId: variant.externalId,
        name: variant.name,
        options: variant.options,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stock: Math.max(0, variant.stock),
        image: variant.image ?? null,
        isDefault: variant.isDefault ?? false,
        isActive: true,
      };

      if (current) {
        await prisma.productVariant.update({ where: { id: current.id }, data: { ...variantData, productId } });
        report.variantsUpdated += 1;
        const change = variantData.stock - current.stock;
        if (change !== 0) {
          await prisma.inventoryLog.create({
            data: {
              productId,
              variantId: current.id,
              change,
              balanceAfter: variantData.stock,
              reason: 'SUPPLIER_SYNC',
              reference: runId,
              note: `Stock updated from ${adapter.displayName}`,
            },
          });
          report.stockChanges += 1;
        }
      } else {
        const created = await prisma.productVariant.create({ data: { ...variantData, sku: variant.sku, productId } });
        report.variantsCreated += 1;
        if (created.stock > 0) {
          await prisma.inventoryLog.create({
            data: {
              productId,
              variantId: created.id,
              change: created.stock,
              balanceAfter: created.stock,
              reason: 'INITIAL_STOCK',
              reference: runId,
              note: `Initial stock from ${adapter.displayName}`,
            },
          });
          report.stockChanges += 1;
        }
      }
    }

    // Variants the supplier no longer lists are deactivated (kept for order history)
    const removed = await prisma.productVariant.updateMany({
      where: { productId, sku: { notIn: seenSkus }, isActive: true },
      data: { isActive: false, stock: 0 },
    });
    report.variantsDeactivated += removed.count;
  }

  // Products this supplier used to list but no longer does are hidden (never deleted, so old
  // orders keep their records). Skipped entirely when the feed came back empty, so a failed or
  // empty response can never hide the whole shop.
  if (seenExternalIds.length > 0) {
    const gone = await prisma.product.updateMany({
      where: { source: adapter.key, isActive: true, externalId: { notIn: seenExternalIds } },
      data: { isActive: false },
    });
    report.productsHidden = gone.count;
  }

  return report;
}

/**
 * Hide every product that came from another source (e.g. the built-in demo
 * catalog) once your real catalog is loaded. Products are hidden, not deleted,
 * so past orders keep their records; re-show them in the admin portal any time.
 */
export async function hideProductsFromSource(source: string): Promise<number> {
  const result = await prisma.product.updateMany({ where: { source, isActive: true }, data: { isActive: false } });
  return result.count;
}
