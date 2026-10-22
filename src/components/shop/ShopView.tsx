'use client';

/**
 * Catalog page: multi-category + brand + price + stock filters, sorting and
 * pagination. All filter state lives in the URL, so results are shareable and
 * the back button works.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, FilterIcon } from '@/components/ui/Icons';
import { apiFetch } from '@/lib/api-client';
import { baseMinorToStoreMajor, CURRENCIES, getStoreCurrency } from '@/lib/currency';
import { cn, pluralize } from '@/lib/utils';
import type { CategoryDTO, ProductListDTO } from '@/types';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
] as const;

function listParam(value: string | null): string[] {
  return (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

export function ShopView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [data, setData] = useState<ProductListDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const q = searchParams.get('q') ?? '';
  const selectedCategories = useMemo(() => listParam(searchParams.get('category')), [searchParams]);
  const selectedBrands = useMemo(() => listParam(searchParams.get('brand')), [searchParams]);
  const inStock = searchParams.get('inStock') === '1';
  const sort = searchParams.get('sort') ?? 'featured';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';

  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => setPriceDraft({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);

  const updateParams = useCallback(
    (changes: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete('page');
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    apiFetch<CategoryDTO[]>('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', '12');
    apiFetch<ProductListDTO>(`/api/products?${params.toString()}`, { signal: controller.signal })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Could not load products.');
        setLoading(false);
      });
    return () => controller.abort();
  }, [searchParams, retryCount]);

  function toggleList(key: 'category' | 'brand', current: string[], value: string) {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateParams({ [key]: next.length > 0 ? next.join(',') : null });
  }

  function applyPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ minPrice: priceDraft.min.trim() || null, maxPrice: priceDraft.max.trim() || null });
    setFiltersOpen(false);
  }

  const categoryNames = new Map(categories.map((c) => [c.slug, c.name]));
  const activeChips: Array<{ label: string; onRemove: () => void }> = [
    ...(q ? [{ label: `“${q}”`, onRemove: () => updateParams({ q: null }) }] : []),
    ...selectedCategories.map((slug) => ({
      label: categoryNames.get(slug) ?? slug,
      onRemove: () => toggleList('category', selectedCategories, slug),
    })),
    ...selectedBrands.map((brand) => ({ label: brand, onRemove: () => toggleList('brand', selectedBrands, brand) })),
    ...(minPrice || maxPrice
      ? [{ label: `${CURRENCIES[getStoreCurrency()].symbol}${minPrice || '0'} – ${maxPrice ? `${CURRENCIES[getStoreCurrency()].symbol}${maxPrice}` : 'any'}`, onRemove: () => updateParams({ minPrice: null, maxPrice: null }) }]
      : []),
    ...(inStock ? [{ label: 'In stock', onRemove: () => updateParams({ inStock: null }) }] : []),
  ];

  const heading =
    q ? `Results for “${q}”` : selectedCategories.length === 1 ? categoryNames.get(selectedCategories[0]) ?? 'Shop' : 'All products';

  const symbol = CURRENCIES[getStoreCurrency()].symbol;
  const priceHint = data?.facets.priceRange.max
    ? `${symbol}${baseMinorToStoreMajor(data.facets.priceRange.min).toLocaleString()} – ${symbol}${baseMinorToStoreMajor(data.facets.priceRange.max).toLocaleString()}`
    : null;

  const filters = (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Category</legend>
        <ul className="mt-3 space-y-1">
          {categories.map((category) => (
            <li key={category.slug}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm text-slate-700 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.slug)}
                  onChange={() => toggleList('category', selectedCategories, category.slug)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600"
                />
                <span className="flex-1">{category.name}</span>
                <span className="text-xs text-slate-400 tabular-nums">{category.productCount}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {data && data.facets.brands.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Brand</legend>
          <ul className="mt-3 space-y-1">
            {data.facets.brands.map((brand) => (
              <li key={brand.name}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.name)}
                    onChange={() => toggleList('brand', selectedBrands, brand.name)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                  />
                  <span className="flex-1">{brand.name}</span>
                  <span className="text-xs text-slate-400 tabular-nums">{brand.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <form onSubmit={applyPrice}>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Price ({symbol})</legend>
          {priceHint ? <p className="mt-1 text-xs text-slate-500">Range: {priceHint}</p> : null}
          <div className="mt-3 flex items-center gap-2">
            <label className="sr-only" htmlFor="price-min">Minimum price</label>
            <input
              id="price-min"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Min"
              value={priceDraft.min}
              onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <span className="text-slate-400">–</span>
            <label className="sr-only" htmlFor="price-max">Maximum price</label>
            <input
              id="price-max"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Max"
              value={priceDraft.max}
              onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button type="submit" className="mt-3 h-10 w-full rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Apply price
          </button>
        </fieldset>
      </form>

      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-800">
        Only show items in stock
        <input
          type="checkbox"
          checked={inStock}
          onChange={() => updateParams({ inStock: inStock ? null : '1' })}
          className="h-5 w-5 accent-brand-600"
        />
      </label>
    </div>
  );

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{heading}</h1>
          <p className="mt-1 text-sm text-slate-500" aria-live="polite">
            {loading && !data ? 'Loading products…' : data ? pluralize(data.total, 'product') : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 lg:hidden"
          >
            <FilterIcon size={18} />
            Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
          </button>
          <label htmlFor="sort" className="sr-only">
            Sort products
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value === 'featured' ? null : e.target.value })}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onRemove}
              className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-2 text-sm font-medium text-brand-800 hover:bg-brand-100"
              aria-label={`Remove filter ${chip.label}`}
            >
              {chip.label}
              <CloseIcon size={14} />
            </button>
          ))}
          <button type="button" onClick={() => router.push(pathname)} className="ml-1 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline">
            Clear all
          </button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Product filters">
          {filters}
        </aside>

        <section aria-label="Products" className={cn('min-w-0 transition-opacity', loading && data && 'opacity-60')}>
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
              <p className="font-semibold">Products could not be loaded</p>
              <p className="mt-1 text-sm">{error}</p>
              <button type="button" onClick={() => setRetryCount((n) => n + 1)} className="mt-3 text-sm font-semibold underline">
                Try again
              </button>
            </div>
          ) : !data ? (
            <ProductGridSkeleton count={8} />
          ) : data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-lg font-semibold text-slate-900">No products match these filters</p>
              <p className="mt-2 text-slate-600">Remove a filter or search for something broader, like “laptop” or “solar”.</p>
              <button type="button" onClick={() => router.push(pathname)} className="btn-secondary mt-5">
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <ProductGrid products={data.items} priorityCount={4} />
              {data.totalPages > 1 ? (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: String(page - 1) }, false)}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon size={18} />
                  </button>
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateParams({ page: n === 1 ? null : String(n) }, false)}
                      aria-current={n === page ? 'page' : undefined}
                      className={cn(
                        'h-10 min-w-10 rounded-lg px-3 text-sm font-semibold tabular-nums',
                        n === page ? 'bg-brand-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={page >= data.totalPages}
                    onClick={() => updateParams({ page: String(page + 1) }, false)}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </section>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/30" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm animate-slide-in-right flex-col bg-white shadow-2xl motion-reduce:animate-none"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100" aria-label="Close filters">
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filters}</div>
            <div className="border-t border-slate-200 p-5">
              <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary w-full">
                {data ? `Show ${pluralize(data.total, 'product')}` : 'Show products'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
