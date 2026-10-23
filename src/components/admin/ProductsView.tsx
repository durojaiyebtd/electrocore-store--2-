'use client';

/**
 * Admin -> Products: inventory table with search, category and status filters.
 * - "Add product" and "Edit" open the quick modal (title, category, ₦ price, stock,
 *   image URL, tech specs). "Full editor" handles variants, options and SEO fields.
 * - "Archive" hides a product from the store without deleting it, so past orders and
 *   stock history stay complete. "Restore" puts it back on sale.
 */
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { PlusIcon } from '@/components/ui/Icons';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { AdminCategoryDTO, AdminProductDetailDTO, AdminProductSummaryDTO, Paginated } from '@/types/admin';
import { ProductImage } from '@/components/product/ProductImage';
import { ProductQuickModal } from './ProductQuickModal';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, SearchField, StockPill, Tabs, adminButton, adminInput, formatRelative, useAdminQuery } from './ui';

type StatusFilter = 'all' | 'active' | 'inactive' | 'low' | 'out';

type ModalState = { open: false } | { open: true; productId: string | null };

export function ProductsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const status = (searchParams.get('status') ?? 'all') as StatusFilter;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (status !== 'all') params.set('status', status);
  params.set('page', String(page));
  const { data, setData, error, loading, reload } = useAdminQuery<Paginated<AdminProductSummaryDTO>>(`/api/admin/products?${params.toString()}`);
  const { data: categories } = useAdminQuery<AdminCategoryDTO[]>('/api/admin/categories');
  // Stable array identity, so the modal does not reset its form on every render
  const categoryList = useMemo(() => categories ?? [], [categories]);

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

  async function setArchived(product: AdminProductSummaryDTO, archive: boolean) {
    setBusyId(product.id);
    setActionError(null);
    setFlash(null);
    try {
      await apiFetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { isActive: !archive } });
      setData((current) => (current ? { ...current, items: current.items.map((p) => (p.id === product.id ? { ...p, isActive: !archive } : p)) } : current));
      setFlash(archive ? `“${product.name}” is archived and hidden from the store.` : `“${product.name}” is back on sale.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the product.');
    } finally {
      setBusyId(null);
    }
  }

  function onSaved(product: AdminProductDetailDTO, mode: 'created' | 'updated') {
    setModal({ open: false });
    setActionError(null);
    setFlash(mode === 'created' ? `“${product.name}” was added${product.isActive ? ' and is on sale' : ' (archived)'}.` : `“${product.name}” was saved.`);
    reload();
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products & inventory"
        description="Add products, change prices and stock, or archive items you no longer sell."
        actions={
          <button type="button" onClick={() => setModal({ open: true, productId: null })} className={adminButton.primary}>
            <PlusIcon size={16} />
            Add product
          </button>
        }
      />

      {flash ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          {flash}
        </p>
      ) : null}

      <Panel>
        <div className="px-4 pt-2">
          <Tabs<StatusFilter>
            label="Product status"
            value={status}
            onChange={(value) => update({ status: value === 'all' ? null : value })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'On sale' },
              { value: 'inactive', label: 'Archived' },
              { value: 'low', label: 'Low stock' },
              { value: 'out', label: 'Out of stock' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <SearchField id="product-search" value={q} onChange={(value) => update({ q: value || null })} placeholder="Name, brand or SKU" />
          <div className="sm:w-60">
            <label htmlFor="product-category" className="sr-only">
              Category
            </label>
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
              <button type="button" onClick={() => setModal({ open: true, productId: null })} className={adminButton.primary}>
                Add product
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 font-medium">Category</th>
                    <th className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th className="px-3 py-2.5 font-medium">Stock</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((product) => (
                    <tr key={product.id} className={cn('hover:bg-slate-50', !product.isActive && 'bg-slate-50/60')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50', !product.isActive && 'opacity-50')}>
                            <ProductImage src={product.image} alt="" className="h-full w-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setModal({ open: true, productId: product.id })}
                              className="text-left font-medium text-slate-900 hover:text-brand-700"
                            >
                              {product.name}
                            </button>
                            <p className="text-xs text-slate-500">
                              {product.brand} · {product.variantCount} variant{product.variantCount === 1 ? '' : 's'} ·{' '}
                              {product.source === 'manual' ? 'added here' : `supplier: ${product.source}`} · edited {formatRelative(product.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {product.categoryName}
                        {product.featured ? (
                          <span className="ml-2">
                            <Pill tone="blue">Featured</Pill>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">
                        {product.variantCount > 1 ? <span className="mr-1 text-xs font-normal text-slate-400">from</span> : null}
                        {formatMoney(product.price)}
                      </td>
                      <td className="px-3 py-3">
                        <StockPill stock={product.totalStock} fulfillment={product.fulfillment} />
                      </td>
                      <td className="px-3 py-3">{product.isActive ? <Pill tone="green">On sale</Pill> : <Pill tone="slate">Archived</Pill>}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setModal({ open: true, productId: product.id })}
                            className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-800 hover:bg-white"
                          >
                            Edit
                          </button>
                          {product.isActive ? (
                            <button
                              type="button"
                              disabled={busyId === product.id}
                              onClick={() => void setArchived(product, true)}
                              className="h-8 rounded-md border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              aria-label={`Archive ${product.name}`}
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === product.id}
                              onClick={() => void setArchived(product, false)}
                              className="h-8 rounded-md border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              aria-label={`Restore ${product.name}`}
                            >
                              Restore
                            </button>
                          )}
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="grid h-8 place-items-center rounded-md px-2 text-xs font-semibold text-brand-700 hover:underline"
                          >
                            Full editor
                          </Link>
                        </div>
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

      <ProductQuickModal
        open={modal.open}
        productId={modal.open ? modal.productId : null}
        categories={categoryList}
        onClose={() => setModal({ open: false })}
        onSaved={onSaved}
      />
    </div>
  );
}
