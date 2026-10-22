/**
 * RESELLER / SUPPLIER ABSTRACTION
 *
 * The storefront never reads supplier data directly. Every supplier (the built-in
 * mock catalog, a wholesale distributor's REST API, a CSV feed, ...) is wrapped in
 * a SupplierAdapter that returns data in the normalised shapes below. The sync
 * service (src/server/services/sync.service.ts) then upserts that data into our
 * own database. Swapping the mock catalog for a live wholesaler = writing (or
 * configuring) one adapter. Nothing else in the app changes.
 *
 * All prices are integers in the minor unit of `currency` (kobo for NGN).
 */
import type { CurrencyCode } from '../currency';

export type SupplierFulfillment = 'PHYSICAL' | 'DIGITAL' | 'SERVICE';

export interface SupplierCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface SupplierVariant {
  /** The variant's ID inside the supplier system */
  externalId: string;
  /** Our SKU — must be unique across the whole store */
  sku: string;
  name: string;
  options: Array<{ name: string; value: string }>;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  image?: string | null;
  isDefault?: boolean;
}

export interface SupplierProduct {
  externalId: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  images: string[];
  specs: Array<{ label: string; value: string }>;
  tags: string[];
  fulfillment: SupplierFulfillment;
  warrantyMonths: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  currency: CurrencyCode;
  variants: SupplierVariant[];
}

export interface SupplierAdapter {
  /** Stored on each product as `source`, e.g. "mock" or "http" */
  readonly key: string;
  readonly displayName: string;
  fetchCategories(): Promise<SupplierCategory[]>;
  fetchProducts(): Promise<SupplierProduct[]>;
}
