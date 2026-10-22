'use client';

/**
 * Quick-view modal: lets shoppers inspect a product, pick a variant and add it
 * to the cart without leaving the grid. Opened from any ProductCard.
 */
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';
import { CloseIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import type { ProductDetailDTO, VariantDTO } from '@/types';
import { ProductGallery } from './ProductGallery';
import { PurchasePanel } from './PurchasePanel';
import { Rating } from './Rating';

interface QuickViewContextValue {
  openQuickView: (slug: string) => void;
}

const QuickViewContext = createContext<QuickViewContextValue | null>(null);

export function useQuickView(): QuickViewContextValue {
  const context = useContext(QuickViewContext);
  if (!context) throw new Error('useQuickView must be used inside <QuickViewProvider>');
  return context;
}

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  const openQuickView = useCallback((next: string) => setSlug(next), []);
  const close = useCallback(() => setSlug(null), []);

  return (
    <QuickViewContext.Provider value={{ openQuickView }}>
      {children}
      {slug ? <QuickViewModal slug={slug} onClose={close} /> : null}
    </QuickViewContext.Provider>
  );
}

function QuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [product, setProduct] = useState<ProductDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variant, setVariant] = useState<VariantDTO | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setError(null);
    apiFetch<{ product: ProductDetailDTO }>(`/api/products/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((data) => {
        setProduct(data.product);
        setVariant(data.product.variants.find((v) => v.isDefault) ?? data.product.variants[0] ?? null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Could not load this product.');
      });
    return () => controller.abort();
  }, [slug]);

  // Escape closes; lock page scroll; return focus to the trigger on close
  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (returnFocusRef.current instanceof HTMLElement) returnFocusRef.current.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={product ? `Quick view: ${product.name}` : 'Quick view'}
        tabIndex={-1}
        className="relative max-h-[92vh] w-full max-w-5xl animate-scale-in overflow-y-auto rounded-t-2xl bg-white shadow-2xl focus:outline-none sm:rounded-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-600 shadow-card hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          aria-label="Close quick view"
        >
          <CloseIcon />
        </button>

        {error ? (
          <div className="p-10 text-center text-slate-700">
            <p>{error}</p>
            <button type="button" onClick={onClose} className="mt-4 font-semibold text-brand-700 underline">
              Back to products
            </button>
          </div>
        ) : !product ? (
          <div className="grid h-80 place-items-center text-brand-600">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-2 md:gap-10">
            <ProductGallery images={product.images} alt={product.name} variantImage={variant?.image} compact />
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-brand-700">{product.brand}</p>
                <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-slate-900">{product.name}</h2>
                <div className="mt-2">
                  <Rating value={product.rating} count={product.reviewCount} />
                </div>
                <p className="mt-3 text-slate-600">{product.shortDescription}</p>
              </div>
              <PurchasePanel product={product} onVariantChange={setVariant} compact />
              <Link
                href={`/product/${product.slug}`}
                onClick={onClose}
                className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                See full specifications and details
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
