'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { PlusIcon } from '@/components/ui/Icons';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { AdminCategoryDTO, AdminProductSummaryDTO, Paginated } from '@/types/admin';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, SearchField, StockPill, Tabs, adminButton, adminInput, formatRelative, useAdminQuery } from './ui';
import { ProductImage } from '@/components/product/ProductImage';
import { ProductModal } from './ProductModal';

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
  /** null = closed, 'new' = create dialog, otherwise the id of the product being edited */
  const [dialog, setDialog] = useState<null | 'new' | string>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Product waiting for the "Yes, delete" confirmation */
  const [deleting, setDeleting] = useState<AdminProductSummaryDTO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await apiFetch(`/api/admin/products/${deleting.id}`, { method: 'DELETE' });
      setNotice(`${deleting.name} was deleted.`);
      setDeleting(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the product.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description="Edit prices, descriptions and variants, or add products you source yourself."
        actions={
          <button type="button" onClick={() => setDialog('new')} className={adminButton.primary}>
            <PlusIcon size={16} />
            Add product
          </button>
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
        {notice ? (
          <p role="status" className="mx-4 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {notice}
          </p>
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
              <button type="button" onClick={() => setDialog('new')} className={adminButton.primary}>
                Add product
              </button>
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
                    <th className="px-3 py-2.5 text-right font-medium">On sale</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
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
                            <button type="button" onClick={() => setDialog(product.id)} className="text-left font-medium text-slate-900 hover:text-brand-700">
                              {product.name}
                            </button>
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
                      <td className="px-3 py-3 text-right">
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
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setDialog(product.id)} className="text-sm font-semibold text-brand-700 hover:underline" aria-label={`Edit ${product.name}`}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(product);
                          }}
                          className="ml-3 text-sm font-semibold text-rose-700 hover:underline"
                          aria-label={`Delete ${product.name}`}
                        >
                          Delete
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

      {deleting ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => (deleteBusy ? undefined : setDeleting(null))} aria-hidden="true" />
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="delete-title" className="text-lg font-semibold text-slate-900">Delete this product?</h2>
            <p className="mt-2 text-sm text-slate-600">
              <strong>{deleting.name}</strong> will be removed from the store for good, together with its variants and stock history. Past orders keep their own record of it. If you only want to stop selling it, use the On sale switch instead.
            </p>
            {deleteError ? (
              <div className="mt-3">
                <ErrorBanner message={deleteError} />
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} disabled={deleteBusy} className={adminButton.secondary}>
                Cancel
              </button>
              <button type="button" onClick={() => void confirmDelete()} disabled={deleteBusy} className={adminButton.danger}>
                {deleteBusy ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog ? (
        <ProductModal
          productId={dialog === 'new' ? undefined : dialog}
          categories={categories ?? []}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setNotice(message);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
