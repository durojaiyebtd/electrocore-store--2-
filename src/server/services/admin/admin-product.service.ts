/**
 * Product management for the admin portal.
 * - Products created here use source "manual", so supplier syncs never overwrite them.
 * - Stock on existing variants only changes through logged inventory adjustments.
 * - Products are deactivated rather than deleted, so order history stays intact.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import type { AdminUser } from '@/lib/admin-auth';
import { randomCode } from '@/lib/ids';
import { slugify } from '@/lib/utils';
import type { ProductInput, QuickProductInput } from '@/lib/admin-validators';
import { site } from '@/lib/site';
import { adjustStock } from '../inventory.service';
import type { Fulfillment } from '@/types';
import type { AdminProductDetailDTO, AdminProductSummaryDTO, Paginated } from '@/types/admin';
import { PLACEHOLDER_IMAGE } from '../catalog.service';
import { LOW_STOCK_THRESHOLD } from './dashboard.service';

const listInclude = {
  category: { select: { name: true } },
  _count: { select: { variants: { where: { isActive: true } } } },
} satisfies Prisma.ProductInclude;

export async function listProducts(query: {
  q?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'low' | 'out';
  page: number;
  pageSize: number;
}): Promise<Paginated<AdminProductSummaryDTO>> {
  const where: Prisma.ProductWhereInput = {};
  if (query.q) {
    const terms = query.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    where.AND = terms.map((term) => ({ searchText: { contains: term } }));
  }
  if (query.category) where.categoryId = query.category;
  if (query.status === 'active') where.isActive = true;
  if (query.status === 'inactive') where.isActive = false;
  if (query.status === 'low') {
    where.isActive = true;
    where.fulfillment = 'PHYSICAL';
    where.totalStock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
  }
  if (query.status === 'out') {
    where.isActive = true;
    where.totalStock = { lte: 0 };
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: listInclude,
      orderBy: [{ updatedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.images[0] ?? PLACEHOLDER_IMAGE,
      categoryName: product.category.name,
      price: product.price,
      totalStock: product.totalStock,
      variantCount: product._count.variants,
      isActive: product.isActive,
      featured: product.featured,
      source: product.source,
      fulfillment: product.fulfillment as Fulfillment,
      updatedAt: product.updatedAt.toISOString(),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getProduct(id: string): Promise<AdminProductDetailDTO> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: [{ isActive: 'desc' }, { isDefault: 'desc' }, { price: 'asc' }] } },
  });
  if (!product) throw new ApiError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    categoryId: product.categoryId,
    shortDescription: product.shortDescription,
    description: product.description,
    images: product.images,
    specs: product.specs.map((s) => ({ label: s.label, value: s.value })),
    tags: product.tags,
    fulfillment: product.fulfillment as Fulfillment,
    warrantyMonths: product.warrantyMonths,
    featured: product.featured,
    isActive: product.isActive,
    source: product.source,
    externalId: product.externalId,
    lastSyncedAt: product.lastSyncedAt ? product.lastSyncedAt.toISOString() : null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options.map((o) => ({ name: o.name, value: o.value })),
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      stock: variant.stock,
      image: variant.image ?? null,
      isDefault: variant.isDefault,
      isActive: variant.isActive,
    })),
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || `product-${randomCode(5).toLowerCase()}`;
  let candidate = root;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${randomCode(4).toLowerCase()}`;
  }
  throw new ApiError(409, 'Could not create a unique URL for this product. Try a different slug.', 'SLUG_TAKEN');
}

async function assertSkusAvailable(skus: string[], productId?: string): Promise<void> {
  const clashes = await prisma.productVariant.findMany({
    where: { sku: { in: skus }, ...(productId ? { productId: { not: productId } } : {}) },
    select: { sku: true, product: { select: { name: true } } },
  });
  if (clashes.length > 0) {
    throw new ApiError(
      409,
      `SKU ${clashes[0].sku} is already used by "${clashes[0].product.name}". Each SKU must be unique.`,
      'SKU_TAKEN',
      clashes.map((c) => c.sku),
    );
  }
}

function variantLabel(variant: ProductInput['variants'][number]): string {
  if (variant.name) return variant.name;
  return variant.options.length > 0 ? variant.options.map((o) => o.value).join(' / ') : 'Standard';
}

function normaliseCompareAt(value: number | null | undefined): number | null {
  return value && value > 0 ? value : null;
}

/** Recompute the price, "was" price, stock total and search text after any change. */
async function refreshProductAggregates(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: { select: { name: true } }, variants: { where: { isActive: true } } },
  });
  if (!product) return;
  const active = product.variants;
  const cheapest = active.reduce<(typeof active)[number] | null>((min, v) => (!min || v.price < min.price ? v : min), null);
  await prisma.product.update({
    where: { id: productId },
    data: {
      price: cheapest?.price ?? 0,
      compareAtPrice: cheapest?.compareAtPrice ?? null,
      totalStock: active.reduce((sum, v) => sum + Math.max(0, v.stock), 0),
      searchText: [product.name, product.brand, product.category.name, product.shortDescription, ...product.tags, ...active.map((v) => v.sku)]
        .join(' ')
        .toLowerCase(),
    },
  });
}

/** Exactly one active variant should be the default (the one preselected on the product page). */
function pickDefaultIndex(variants: ProductInput['variants']): number {
  const flagged = variants.findIndex((v) => v.isDefault && v.isActive);
  if (flagged >= 0) return flagged;
  const firstActive = variants.findIndex((v) => v.isActive);
  return firstActive >= 0 ? firstActive : 0;
}

export async function createProduct(input: ProductInput, admin: AdminUser): Promise<AdminProductDetailDTO> {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
  if (!category) throw new ApiError(400, 'Choose a valid category.', 'CATEGORY_NOT_FOUND');
  await assertSkusAvailable(input.variants.map((v) => v.sku));

  const slug = await uniqueSlug(input.slug || input.name);
  const defaultIndex = pickDefaultIndex(input.variants);

  const product = await prisma.product.create({
    data: {
      slug,
      name: input.name,
      brand: input.brand,
      shortDescription: input.shortDescription,
      description: input.description,
      images: input.images,
      specs: input.specs,
      tags: input.tags,
      searchText: input.name.toLowerCase(),
      price: 0,
      fulfillment: input.fulfillment,
      warrantyMonths: input.warrantyMonths,
      featured: input.featured,
      isActive: input.isActive,
      source: 'manual',
      externalId: `MANUAL-${randomCode(10)}`,
      category: { connect: { id: input.categoryId } },
    },
  });

  for (const [index, variant] of input.variants.entries()) {
    const created = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: variant.sku,
        externalId: `MANUAL-${variant.sku}`,
        name: variantLabel(variant),
        options: variant.options,
        price: variant.price,
        compareAtPrice: normaliseCompareAt(variant.compareAtPrice),
        stock: variant.stock,
        image: variant.image || null,
        isDefault: index === defaultIndex,
        isActive: variant.isActive,
      },
    });
    if (created.stock > 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          variantId: created.id,
          change: created.stock,
          balanceAfter: created.stock,
          reason: 'INITIAL_STOCK',
          note: 'Opening stock entered in the admin portal',
          actor: admin.email,
        },
      });
    }
  }

  await refreshProductAggregates(product.id);
  return getProduct(product.id);
}

export async function updateProduct(id: string, input: ProductInput, admin: AdminUser): Promise<AdminProductDetailDTO> {
  const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existing) throw new ApiError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
  const category = await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
  if (!category) throw new ApiError(400, 'Choose a valid category.', 'CATEGORY_NOT_FOUND');

  await assertSkusAvailable(input.variants.map((v) => v.sku), id);
  const existingIds = new Set(existing.variants.map((v) => v.id));
  for (const variant of input.variants) {
    if (variant.id && !existingIds.has(variant.id)) {
      throw new ApiError(400, `Variant ${variant.sku} does not belong to this product.`, 'VARIANT_MISMATCH');
    }
  }

  const slug = input.slug && input.slug !== existing.slug ? await uniqueSlug(input.slug, id) : existing.slug;

  await prisma.product.update({
    where: { id },
    data: {
      slug,
      name: input.name,
      brand: input.brand,
      shortDescription: input.shortDescription,
      description: input.description,
      images: input.images,
      specs: input.specs,
      tags: input.tags,
      fulfillment: input.fulfillment,
      warrantyMonths: input.warrantyMonths,
      featured: input.featured,
      isActive: input.isActive,
      category: { connect: { id: input.categoryId } },
    },
  });

  const defaultIndex = pickDefaultIndex(input.variants);
  const keptIds = new Set<string>();

  for (const [index, variant] of input.variants.entries()) {
    const shared = {
      sku: variant.sku,
      name: variantLabel(variant),
      options: variant.options,
      price: variant.price,
      compareAtPrice: normaliseCompareAt(variant.compareAtPrice),
      image: variant.image || null,
      isDefault: index === defaultIndex,
      isActive: variant.isActive,
    };
    if (variant.id) {
      keptIds.add(variant.id);
      await prisma.productVariant.update({ where: { id: variant.id }, data: shared });
    } else {
      const created = await prisma.productVariant.create({
        data: { ...shared, productId: id, externalId: `MANUAL-${variant.sku}`, stock: variant.stock },
      });
      if (created.stock > 0) {
        await prisma.inventoryLog.create({
          data: {
            productId: id,
            variantId: created.id,
            change: created.stock,
            balanceAfter: created.stock,
            reason: 'INITIAL_STOCK',
            note: 'Opening stock for new variant',
            actor: admin.email,
          },
        });
      }
    }
  }

  // Variants removed in the form are deactivated (kept for order history and logs)
  const removed = existing.variants.filter((v) => !keptIds.has(v.id) && v.isActive).map((v) => v.id);
  if (removed.length > 0) {
    await prisma.productVariant.updateMany({ where: { id: { in: removed } }, data: { isActive: false, isDefault: false } });
  }

  await refreshProductAggregates(id);
  return getProduct(id);
}

export async function setProductActive(id: string, isActive: boolean): Promise<AdminProductDetailDTO> {
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw new ApiError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
  await prisma.product.update({ where: { id }, data: { isActive } });
  return getProduct(id);
}

// ----------------------------------------------------------------------------
// Quick create / edit (the modal form in Admin -> Products)
// ----------------------------------------------------------------------------

/** "hp elitebook 840" -> "HP", "samsung galaxy" -> "Samsung" */
export function guessBrand(title: string): string {
  const first = title.trim().split(/\s+/)[0] ?? '';
  const word = first.replace(/[^A-Za-z0-9&-]/g, '');
  if (!word) return 'Generic';
  if (word.length <= 3) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Short and full descriptions for a product typed into the quick form. */
export function quickDescriptions(title: string, description: string): { shortDescription: string; description: string } {
  const text = description.trim();
  if (text.length >= 20) {
    const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
    const short = (firstSentence.length >= 10 ? firstSentence : text).slice(0, 300);
    return { shortDescription: short, description: text };
  }
  return {
    shortDescription: `${title} from ${site.brandName}.`.slice(0, 300),
    description: `${title}. Sold and supported by ${site.legalName}, with secure Naira payment through Paystack and delivery across Nigeria.`,
  };
}

export async function quickCreateProduct(input: QuickProductInput, admin: AdminUser): Promise<AdminProductDetailDTO> {
  const descriptions = quickDescriptions(input.name, input.description);
  return createProduct(
    {
      name: input.name,
      slug: '',
      brand: input.brand || guessBrand(input.name),
      categoryId: input.categoryId,
      shortDescription: descriptions.shortDescription,
      description: descriptions.description,
      images: input.imageUrl ? [input.imageUrl] : [],
      specs: input.specs,
      tags: [],
      fulfillment: 'PHYSICAL',
      warrantyMonths: 0,
      featured: false,
      isActive: input.isActive,
      variants: [
        {
          sku: `MES-${randomCode(8)}`,
          name: '',
          options: [],
          price: input.price,
          compareAtPrice: null,
          stock: input.stock,
          image: null,
          isDefault: true,
          isActive: true,
        },
      ],
    },
    admin,
  );
}

/**
 * Applies the quick form to an existing product.
 * - Title, category, brand, main image, specs, description and visibility always update.
 * - Price and stock update only when the product has a single active variant; products with
 *   several variants keep their per-variant prices (edit those in the full editor).
 * - A changed stock count is applied as a logged inventory adjustment ("set to N"), so the
 *   change appears in the stock history with the admin's email.
 */
export async function quickUpdateProduct(id: string, input: QuickProductInput, admin: AdminUser): Promise<AdminProductDetailDTO> {
  const existing = await getProduct(id);
  const activeVariants = existing.variants.filter((v) => v.isActive);
  const single = activeVariants.length <= 1;
  const target = activeVariants[0] ?? existing.variants[0] ?? null;

  const primary = existing.images[0] ?? '';
  let images: string[];
  if (input.imageUrl === primary) images = existing.images;
  else if (input.imageUrl === '') images = existing.images.slice(1);
  else images = [input.imageUrl, ...existing.images.filter((image) => image !== input.imageUrl && image !== primary)];

  const descriptions =
    input.description.trim().length > 0
      ? quickDescriptions(input.name, input.description)
      : { shortDescription: existing.shortDescription, description: existing.description };

  const variants: ProductInput['variants'] =
    existing.variants.length > 0
      ? existing.variants.map((variant) => {
          const isTarget = single && target !== null && variant.id === target.id;
          const price = isTarget ? input.price : variant.price;
          const compareAt = variant.compareAtPrice && variant.compareAtPrice > price ? variant.compareAtPrice : null;
          return {
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            options: variant.options,
            price,
            compareAtPrice: compareAt,
            stock: variant.stock,
            image: variant.image,
            isDefault: variant.isDefault,
            isActive: isTarget ? true : variant.isActive,
          };
        })
      : [
          {
            sku: `MES-${randomCode(8)}`,
            name: '',
            options: [],
            price: input.price,
            compareAtPrice: null,
            stock: input.stock,
            image: null,
            isDefault: true,
            isActive: true,
          },
        ];

  await updateProduct(
    id,
    {
      name: input.name,
      slug: existing.slug,
      brand: input.brand || existing.brand,
      categoryId: input.categoryId,
      shortDescription: descriptions.shortDescription,
      description: descriptions.description,
      images,
      specs: input.specs,
      tags: existing.tags,
      fulfillment: existing.fulfillment,
      warrantyMonths: existing.warrantyMonths,
      featured: existing.featured,
      isActive: input.isActive,
      variants,
    },
    admin,
  );

  if (single && target && input.stock !== target.stock) {
    await adjustStock({
      variantId: target.id,
      mode: 'set',
      quantity: input.stock,
      reason: 'ADJUSTMENT',
      note: `Stock count set to ${input.stock} in Products quick edit`,
      actor: admin.email,
    });
  }

  return getProduct(id);
}
