/**
 * "http" supplier adapter — connects to an external wholesale/distributor REST API.
 *
 * Configure with:
 *   SUPPLIER_PROVIDER="http"
 *   SUPPLIER_API_URL="https://api.your-wholesaler.com/v1"
 *   SUPPLIER_API_KEY="..."              (sent as  Authorization: Bearer <key>)
 *   SUPPLIER_MARKUP_PERCENT="18"        (added on top of the supplier's cost price)
 *
 * Expected endpoints & JSON (adapt `mapRemoteProduct` if your supplier differs):
 *
 *   GET {SUPPLIER_API_URL}/categories
 *   -> { "data": [ { "id": "laptops", "name": "Laptops", "description": "..." } ] }
 *
 *   GET {SUPPLIER_API_URL}/products?page=1&per_page=100
 *   -> {
 *        "data": [{
 *          "id": "SUP-123", "name": "...", "brand": "...", "category_id": "laptops",
 *          "summary": "...", "description": "...", "images": ["https://..."],
 *          "specs": { "Processor": "..." }, "tags": ["..."],
 *          "type": "physical" | "digital" | "service",
 *          "warranty_months": 12, "rating": 4.5, "review_count": 10,
 *          "currency": "NGN",
 *          "variants": [{
 *             "id": "SUP-123-A", "sku": "ABC-1", "name": "16GB / 512GB",
 *             "attributes": { "Memory": "16GB", "Storage": "512GB" },
 *             "cost_price": 950000.00, "msrp": 1290000.00, "stock": 12, "image": "https://..."
 *          }]
 *        }],
 *        "meta": { "page": 1, "total_pages": 3 }
 *      }
 *   Prices from the supplier are MAJOR units (e.g. Naira, not kobo).
 */
import { slugify } from '../utils';
import { toMinor, type CurrencyCode } from '../currency';
import type { SupplierAdapter, SupplierCategory, SupplierFulfillment, SupplierProduct } from './types';

interface RemoteCategory {
  id: string;
  name: string;
  description?: string;
}

interface RemoteVariant {
  id: string;
  sku: string;
  name?: string;
  attributes?: Record<string, string>;
  cost_price: number;
  msrp?: number | null;
  stock: number;
  image?: string | null;
}

interface RemoteProduct {
  id: string;
  name: string;
  brand?: string;
  category_id: string;
  summary?: string;
  description?: string;
  images?: string[];
  specs?: Record<string, string>;
  tags?: string[];
  type?: 'physical' | 'digital' | 'service';
  warranty_months?: number;
  rating?: number;
  review_count?: number;
  featured?: boolean;
  currency?: string;
  variants: RemoteVariant[];
}

interface RemotePage<T> {
  data: T[];
  meta?: { page?: number; total_pages?: number };
}

function config() {
  const baseUrl = (process.env.SUPPLIER_API_URL ?? '').replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('SUPPLIER_API_URL is not set. Add it to .env or switch SUPPLIER_PROVIDER back to "mock".');
  }
  const markup = Number(process.env.SUPPLIER_MARKUP_PERCENT ?? '0');
  return {
    baseUrl,
    apiKey: process.env.SUPPLIER_API_KEY ?? '',
    markupMultiplier: 1 + (Number.isFinite(markup) ? markup : 0) / 100,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const { baseUrl, apiKey } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Supplier API ${path} responded with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

const FULFILLMENT_MAP: Record<string, SupplierFulfillment> = {
  physical: 'PHYSICAL',
  digital: 'DIGITAL',
  service: 'SERVICE',
};

/** Round a selling price up to the nearest ₦100 for clean price points. */
function roundPrice(major: number): number {
  return Math.ceil(major / 100) * 100;
}

export function mapRemoteProduct(remote: RemoteProduct, markupMultiplier: number): SupplierProduct {
  const currency: CurrencyCode = remote.currency?.toUpperCase() === 'USD' ? 'USD' : 'NGN';
  return {
    externalId: remote.id,
    slug: slugify(`${remote.brand ?? ''} ${remote.name}`),
    name: remote.name,
    brand: remote.brand ?? 'Generic',
    categorySlug: slugify(remote.category_id),
    shortDescription: remote.summary ?? remote.description?.slice(0, 160) ?? remote.name,
    description: remote.description ?? remote.summary ?? remote.name,
    images: remote.images && remote.images.length > 0 ? remote.images : [],
    specs: Object.entries(remote.specs ?? {}).map(([label, value]) => ({ label, value: String(value) })),
    tags: remote.tags ?? [],
    fulfillment: FULFILLMENT_MAP[remote.type ?? 'physical'] ?? 'PHYSICAL',
    warrantyMonths: remote.warranty_months ?? 0,
    rating: remote.rating ?? 0,
    reviewCount: remote.review_count ?? 0,
    featured: remote.featured ?? false,
    currency,
    variants: remote.variants.map((variant, index) => {
      const sellingMajor = roundPrice(variant.cost_price * markupMultiplier);
      const msrpMajor = variant.msrp && variant.msrp > sellingMajor ? variant.msrp : null;
      const attributes = Object.entries(variant.attributes ?? {});
      return {
        externalId: variant.id,
        sku: variant.sku.toUpperCase(),
        name: variant.name ?? (attributes.length > 0 ? attributes.map(([, v]) => v).join(' / ') : 'Standard'),
        options: attributes.map(([name, value]) => ({ name, value })),
        price: toMinor(sellingMajor, currency),
        compareAtPrice: msrpMajor ? toMinor(msrpMajor, currency) : null,
        stock: Math.max(0, Math.floor(variant.stock)),
        image: variant.image ?? null,
        isDefault: index === 0,
      };
    }),
  };
}

export const httpSupplier: SupplierAdapter = {
  key: 'http',
  displayName: 'External wholesale API',
  async fetchCategories(): Promise<SupplierCategory[]> {
    const page = await getJson<RemotePage<RemoteCategory>>('/categories');
    return page.data.map((category, index) => ({
      slug: slugify(category.id),
      name: category.name,
      description: category.description ?? category.name,
      icon: 'chip',
      sortOrder: 100 + index,
    }));
  },
  async fetchProducts(): Promise<SupplierProduct[]> {
    const { markupMultiplier } = config();
    const products: SupplierProduct[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await getJson<RemotePage<RemoteProduct>>(`/products?page=${page}&per_page=100`);
      for (const remote of result.data) {
        if (remote.variants && remote.variants.length > 0) {
          products.push(mapRemoteProduct(remote, markupMultiplier));
        }
      }
      totalPages = result.meta?.total_pages ?? page;
      page += 1;
    } while (page <= totalPages);
    return products;
  },
};
