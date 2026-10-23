/**
 * Catalog queries: product listing with multi-category filters, product detail,
 * related products and categories. Returns DTOs (plain JSON-safe objects).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { storeMajorToBaseMinor } from '@/lib/currency';
import type { ProductQuery } from '@/lib/validators';
import type {
  CategoryDTO,
  Fulfillment,
  OptionGroupDTO,
  ProductDetailDTO,
  ProductListDTO,
  ProductSummaryDTO,
  VariantDTO,
} from '@/types';

export const PLACEHOLDER_IMAGE = '/products/placeholder.svg';

const summaryInclude = {
  category: { select: { name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: { id: true, isDefault: true, price: true },
    orderBy: { price: 'asc' },
  },
} satisfies Prisma.ProductInclude;

type ProductWithSummary = Prisma.ProductGetPayload<{ include: typeof summaryInclude }>;

const detailInclude = {
  category: { select: { name: true, slug: true } },
  variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductWithDetail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

function toSummary(product: ProductWithSummary | ProductWithDetail): ProductSummaryDTO {
  // Normalise the two payload shapes to the fields we need (avoids union-array method issues)
  const variants: Array<{ id: string; isDefault: boolean }> = product.variants;
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0] ?? null;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    shortDescription: product.shortDescription,
    image: product.images[0] ?? PLACEHOLDER_IMAGE,
    hoverImage: product.images[1] ?? null,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    rating: product.rating,
    reviewCount: product.reviewCount,
    inStock: product.totalStock > 0,
    totalStock: product.totalStock,
    fulfillment: product.fulfillment as Fulfillment,
    featured: product.featured,
    category: { name: product.category.name, slug: product.category.slug },
    defaultVariantId: defaultVariant?.id ?? null,
    variantCount: variants.length,
  };
}

function buildOptionGroups(variants: VariantDTO[]): OptionGroupDTO[] {
  const groups = new Map<string, string[]>();
  for (const variant of variants) {
    for (const option of variant.options) {
      const values = groups.get(option.name) ?? [];
      if (!values.includes(option.value)) values.push(option.value);
      groups.set(option.name, values);
    }
  }
  return Array.from(groups.entries()).map(([name, values]) => ({ name, values }));
}

function toDetail(product: ProductWithDetail): ProductDetailDTO {
  const variants: VariantDTO[] = product.variants
    .map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options.map((o) => ({ name: o.name, value: o.value })),
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      stock: variant.stock,
      image: variant.image ?? null,
      isDefault: variant.isDefault,
    }))
    // keep the supplier's natural order: default first, then by price
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.price - b.price);

  return {
    ...toSummary(product),
    description: product.description,
    images: product.images.length > 0 ? product.images : [PLACEHOLDER_IMAGE],
    specs: product.specs.map((s) => ({ label: s.label, value: s.value })),
    tags: product.tags,
    warrantyMonths: product.warrantyMonths,
    variants,
    optionGroups: buildOptionGroups(variants),
  };
}

function splitList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const SORTS: Record<ProductQuery['sort'], Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ homeRank: 'desc' }, { featured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  rating: [{ rating: 'desc' }, { reviewCount: 'desc' }],
};

export async function listProducts(query: ProductQuery): Promise<ProductListDTO> {
  const categorySlugs = splitList(query.category);
  const brands = splitList(query.brand);

  // Base filter (without brand/price) — used for facet counts so shoppers can see other options
  const base: Prisma.ProductWhereInput = { isActive: true };
  if (categorySlugs.length > 0) {
    base.category = { slug: { in: categorySlugs } };
  }
  if (query.q) {
    const terms = query.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    base.AND = terms.map((term) => ({ searchText: { contains: term } }));
  }
  if (query.inStock === '1' || query.inStock === 'true') {
    base.totalStock = { gt: 0 };
  }
  if (query.featured) {
    base.featured = true;
  }

  const where: Prisma.ProductWhereInput = { ...base };
  if (brands.length > 0) {
    where.brand = { in: brands };
  }
  const priceFilter: Prisma.IntFilter = {};
  if (query.minPrice !== undefined) priceFilter.gte = storeMajorToBaseMinor(query.minPrice);
  if (query.maxPrice !== undefined && query.maxPrice > 0) priceFilter.lte = storeMajorToBaseMinor(query.maxPrice);
  if (Object.keys(priceFilter).length > 0) where.price = priceFilter;

  const skip = (query.page - 1) * query.pageSize;

  const [total, products, brandGroups, priceAgg] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: summaryInclude,
      orderBy: SORTS[query.sort],
      skip,
      take: query.pageSize,
    }),
    prisma.product.groupBy({
      by: ['brand'],
      where: base,
      _count: { _all: true },
      orderBy: { brand: 'asc' },
    }),
    prisma.product.aggregate({ where: base, _min: { price: true }, _max: { price: true } }),
  ]);

  return {
    items: products.map(toSummary),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    facets: {
      brands: brandGroups.map((group) => ({ name: group.brand, count: group._count._all })),
      priceRange: { min: priceAgg._min.price ?? 0, max: priceAgg._max.price ?? 0 },
    },
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: detailInclude,
  });
  return product ? toDetail(product) : null;
}

export async function getRelatedProducts(productId: string, categorySlug: string, limit = 4): Promise<ProductSummaryDTO[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, id: { not: productId }, category: { slug: categorySlug } },
    include: summaryInclude,
    orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
    take: limit,
  });
  if (products.length >= limit) return products.map(toSummary);

  // Top up with popular products from other categories
  const extra = await prisma.product.findMany({
    where: { isActive: true, id: { notIn: [productId, ...products.map((p) => p.id)] } },
    include: summaryInclude,
    orderBy: [{ featured: 'desc' }, { reviewCount: 'desc' }],
    take: limit - products.length,
  });
  return [...products, ...extra].map(toSummary);
}

/**
 * Products that should NOT lead the homepage. Monitors and HP laptops stay in the
 * shop and in their categories; they only appear in "Top picks" after everything
 * else, unless an admin gives them a Homepage priority.
 */
export function isDeferredForHome(product: { brand: string; category: { name: string; slug: string } }): boolean {
  const category = `${product.category.name} ${product.category.slug}`.toLowerCase();
  if (/monitor|display/.test(category)) return true;
  return /laptop/.test(category) && /^hp\b/i.test(product.brand.trim());
}

/**
 * Orders products for the homepage "Top picks" row:
 * 1. products an admin pinned with a Homepage priority (highest number first),
 * 2. then a mix with one product per category in turn, so the row is varied,
 * 3. then deferred products (monitors, HP laptops) last.
 * Pure function so it can be tested without a database.
 */
export function arrangeForHome<T extends { id: string; homeRank: number; featured: boolean; rating: number; brand: string; category: { name: string; slug: string } }>(products: T[], limit: number): T[] {
  const pinned = products.filter((p) => p.homeRank > 0).sort((a, b) => b.homeRank - a.homeRank);
  const rest = products
    .filter((p) => p.homeRank <= 0)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  const normal = rest.filter((p) => !isDeferredForHome(p));
  const deferred = rest.filter((p) => isDeferredForHome(p));

  const byCategory = new Map<string, T[]>();
  for (const product of normal) {
    const list = byCategory.get(product.category.slug) ?? [];
    list.push(product);
    byCategory.set(product.category.slug, list);
  }
  const mixed: T[] = [];
  const queues = Array.from(byCategory.values());
  for (let round = 0; queues.some((queue) => queue.length > round); round += 1) {
    for (const queue of queues) if (queue[round]) mixed.push(queue[round]);
  }
  return [...pinned, ...mixed, ...deferred].slice(0, limit);
}

export async function getFeaturedProducts(limit = 8): Promise<ProductSummaryDTO[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, totalStock: { gt: 0 } },
    include: summaryInclude,
    orderBy: [{ featured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
    take: 300,
  });
  return arrangeForHome(products, limit).map(toSummary);
}

export async function listCategories(): Promise<CategoryDTO[]> {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.product.groupBy({ by: ['categoryId'], where: { isActive: true }, _count: { _all: true } }),
  ]);
  const countById = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  // Storefront only: a category with nothing on sale would be an empty tile in the
  // homepage grid, the shop filter and the footer, so it stays hidden until it has products.
  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon ?? null,
      productCount: countById.get(category.id) ?? 0,
    }))
    .filter((category) => category.productCount > 0);
}
