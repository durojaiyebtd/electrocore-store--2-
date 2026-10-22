/**
 * "mock" supplier adapter — turns the built-in demo catalog into normalised
 * SupplierProduct records (expanding option axes into every variant combination).
 */
import { toMinor } from '../currency';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, type MockAxisValue, type MockProductDef } from './mock-catalog';
import type { SupplierAdapter, SupplierProduct, SupplierVariant } from './types';

export function galleryImagePaths(slug: string): string[] {
  return [1, 2, 3].map((n) => `/products/${slug}-${n}.svg`);
}

export function colorImagePath(slug: string, colorCode: string): string {
  return `/products/${slug}-${colorCode}.svg`;
}

/** Cartesian product of option axes: [[a,b],[x,y]] -> [[a,x],[a,y],[b,x],[b,y]] */
function combinations(def: MockProductDef): MockAxisValue[][] {
  return def.axes.reduce<MockAxisValue[][]>(
    (acc, axis) => acc.flatMap((combo) => axis.values.map((value) => [...combo, value])),
    [[]],
  );
}

function buildVariants(def: MockProductDef): SupplierVariant[] {
  const combos = combinations(def);
  return combos.map((combo, index) => {
    const codes = combo.map((v) => v.code);
    const key = codes.join('-');
    const delta = combo.reduce((sum, v) => sum + (v.priceDelta ?? 0), 0);
    const colorValue = combo.find((v) => v.colorHex);
    const stock = def.stockOverrides && key in def.stockOverrides ? def.stockOverrides[key] : def.stock;
    return {
      externalId: key ? `${def.id}-${key}` : `${def.id}-STD`,
      sku: key ? `${def.skuPrefix}-${key}`.toUpperCase() : `${def.skuPrefix}-STD`.toUpperCase(),
      name: combo.length > 0 ? combo.map((v) => v.value).join(' / ') : 'Standard',
      options: combo.map((value, axisIndex) => ({ name: def.axes[axisIndex].name, value: value.value })),
      price: toMinor(def.basePrice + delta),
      compareAtPrice: def.compareAtPrice ? toMinor(def.compareAtPrice + delta) : null,
      stock,
      image: colorValue ? colorImagePath(def.slug, colorValue.code) : null,
      isDefault: index === 0,
    };
  });
}

export function mapMockProduct(def: MockProductDef): SupplierProduct {
  return {
    externalId: def.id,
    slug: def.slug,
    name: def.name,
    brand: def.brand,
    categorySlug: def.category,
    shortDescription: def.short,
    description: def.description,
    images: galleryImagePaths(def.slug),
    specs: def.specs.map(([label, value]) => ({ label, value })),
    tags: def.tags,
    fulfillment: def.fulfillment,
    warrantyMonths: def.warrantyMonths,
    rating: def.rating,
    reviewCount: def.reviewCount,
    featured: def.featured,
    currency: 'NGN',
    variants: buildVariants(def),
  };
}

export const mockSupplier: SupplierAdapter = {
  key: 'mock',
  displayName: 'Built-in demo catalog',
  async fetchCategories() {
    return MOCK_CATEGORIES;
  },
  async fetchProducts() {
    return MOCK_PRODUCTS.map(mapMockProduct);
  },
};
