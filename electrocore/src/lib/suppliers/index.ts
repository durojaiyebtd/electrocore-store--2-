/**
 * Supplier registry. Add a new wholesaler by writing an adapter that implements
 * SupplierAdapter and registering it here.
 */
import { httpSupplier } from './http-supplier';
import { mockSupplier } from './mock-supplier';
import { technocratSupplier } from './technocrat-supplier';
import type { SupplierAdapter } from './types';

const ADAPTERS: Record<string, SupplierAdapter> = {
  [mockSupplier.key]: mockSupplier,
  [httpSupplier.key]: httpSupplier,
  [technocratSupplier.key]: technocratSupplier,
};

export function getSupplier(key?: string): SupplierAdapter {
  const selected = (key ?? process.env.SUPPLIER_PROVIDER ?? 'technocrat').trim().toLowerCase();
  const adapter = ADAPTERS[selected];
  if (!adapter) {
    throw new Error(`Unknown supplier "${selected}". Available: ${Object.keys(ADAPTERS).join(', ')}`);
  }
  return adapter;
}

export function listSuppliers(): string[] {
  return Object.keys(ADAPTERS);
}

export type { SupplierAdapter, SupplierProduct, SupplierVariant, SupplierCategory } from './types';
