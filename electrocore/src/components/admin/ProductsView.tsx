'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { PlusIcon } from '@/components/ui/Icons';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { AdminCategoryDTO, AdminProductSummaryDTO, Paginated } from '@/types/admin';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, SearchField, StockPill, Tabs, adminButton, adminInput, formatRelative, useAdminQuery } from './ui';
import { ProductImage } from '@/components/product/ProductImage';

type StatusFilter = 'all' | 'active' | 'inactive' | 'low' | 'out';

export function ProductsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const status = (searchParams.get('status') ?? 'all') as StatusFilter;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const [toggling, setToggling] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (status !== 'all') params.set('status', status);
  params.set('page', String(page));
  const { data, setData, error, loading, reload } = useAdminQuery<Paginated<AdminProductSummaryDTO>>(`/api/admin/products?${params.toString()}`);
  const { data: categories } = useAdminQuery<AdminCategoryDTO[]>('/api/admin/categories');

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in changes)) next.delete('page');
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams],
  );

  async function toggleActive(product: AdminProductSummaryDTO) {
    setToggling(product.id);
    setActionError(null);
    try {
      await apiFetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { isActive: !product.isActive } });
      setData((current) =>
        current ? { ...current, items: current.items.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p)) } : current,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the product.');
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description="Edit prices, descriptions and variants, or add products you source yourself."
        actions={
          <Link href="/admin/products/new" className={adminButton.primary}>
            <PlusIcon size={16} />
            Add product
          </Link>
        }
      />

      <Panel>
        <div className="px-4 pt-2">
          <Tabs<StatusFilter>
            label="Product status"
            value={status}
            onChange={(value) => update({ status: value === 'all' ? null : value })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'On sale' },
              { value: 'inactive', label: 'Hidden' },
              { value: 'low', label: 'Low stock' },
              { value: 'out', label: 'Out of stock' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <SearchField id="product-search" value={q} onChange={(value) => update({ q: value || null })} placeholder="Name, brand or SKU" />
          <div className="sm:w-60">
            <label htmlFor="product-category" className="sr-only">Category</label>
            <select id="product-category" value={category} onChange={(e) => update({ category: e.target.value || null })} className={adminInput}>
              <option value="">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {actionError ? (
          <div className="px-4 pb-3">
            <ErrorBanner message={actionError} />
          </div>
        ) : null}

        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <LoadingBlock />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No products found"
            body={q || category || status !== 'all' ? 'Try a different search or filter.' : 'Add your first product, or run a supplier sync from Settings.'}
            action={
              <Link href="/admin/products/new" className={adminButton.primary}>
                Add product
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 font-medium">Category</th>
                    <th className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th className="px-3 py-2.5 font-medium">Stock</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-4 py-2.5 text-right font-medium">On sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((product) => (
                    <tr key={product.id} className={cn('hover:bg-slate-50', !product.isActive && 'opacity-60')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                            <ProductImage src={product.image} alt="" className="h-full w-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <Link href={`/admin/products/${product.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                              {product.name}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {product.brand} · {product.variantCount} variant{product.variantCount === 1 ? '' : 's'} · edited {formatRelative(product.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {product.categoryName}
                        {product.featured ? <span className="ml-2"><Pill tone="blue">Featured</Pill></span> : null}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">
                        {product.variantCount > 1 ? <span className="mr-1 text-xs font-normal text-slate-400">from</span> : null}
                        {formatMoney(product.price)}
                      </td>
                      <td className="px-3 py-3">
                        <StockPill stock={product.totalStock} fulfillment={product.fulfillment} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{product.source === 'manual' ? 'Added here' : `Supplier: ${product.source}`}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.isActive}
                          aria-label={`${product.isActive ? 'Hide' : 'Show'} ${product.name} in the store`}
                          disabled={toggling === product.id}
                          onClick={() => void toggleActive(product)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
                            product.isActive ? 'bg-brand-600' : 'bg-slate-300',
                          )}
                        >
                          <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', product.isActive ? 'translate-x-5' : 'translate-x-0.5')} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={(next) => update({ page: String(next) })} />
          </>
        )}
      </Panel>
    </div>
  );
}
