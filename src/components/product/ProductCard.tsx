'use client';

import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { EyeIcon, PlusIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { discountPercent, formatMoney } from '@/lib/currency';
import type { ProductSummaryDTO } from '@/types';
import { ProductImage } from './ProductImage';
import { Rating } from './Rating';
import { useQuickView } from './QuickViewProvider';

const FULFILLMENT_LABEL: Record<ProductSummaryDTO['fulfillment'], string | null> = {
  PHYSICAL: null,
  DIGITAL: 'Instant licence delivery',
  SERVICE: 'Service booking',
};

/**
 * Marketplace-style product card: a big clean photo on white, the name, the price
 * and an always-visible add-to-cart button (no hover needed on phones).
 */
export function ProductCard({ product, priority = false }: { product: ProductSummaryDTO; priority?: boolean }) {
  const { addItem, addingVariantId } = useCart();
  const { openQuickView } = useQuickView();
  const saving = discountPercent(product.price, product.compareAtPrice);
  const singleVariant = product.variantCount <= 1 && product.defaultVariantId !== null;
  const adding = addingVariantId !== null && addingVariantId === product.defaultVariantId;
  const label = FULFILLMENT_LABEL[product.fulfillment];
  const lowStock = product.inStock && product.fulfillment === 'PHYSICAL' && product.totalStock > 0 && product.totalStock <= 5;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-lift">
      <div className="relative aspect-square overflow-hidden bg-white">
        <Link href={`/product/${product.slug}`} className="block h-full focus-visible:outline-none" tabIndex={-1} aria-hidden="true">
          <ProductImage
            src={product.image}
            alt=""
            fallbackLabel={product.name}
            loading={priority ? 'eager' : 'lazy'}
            className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.04]"
          />
          {product.hoverImage ? (
            <ProductImage src={product.hoverImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full bg-white object-contain p-2 opacity-0 transition duration-300 group-hover:opacity-100" />
          ) : null}
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {saving > 0 ? <span className="rounded-full bg-volt-400 px-2.5 py-1 text-xs font-bold text-slate-900">−{saving}%</span> : null}
          {!product.inStock ? <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white">Sold out</span> : null}
        </div>
        <button
          type="button"
          onClick={() => openQuickView(product.slug)}
          className="absolute right-2 top-2 hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-card transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          aria-label={`Quick view ${product.name}`}
        >
          <EyeIcon size={14} />
          Quick view
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-slate-100 p-3 sm:p-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">{product.brand}</p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-slate-900 sm:text-[0.95rem]">
          <Link href={`/product/${product.slug}`} className="hover:text-brand-700 focus-visible:underline focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <Rating value={product.rating} count={product.reviewCount} compact />
        {label ? <p className="text-xs font-medium text-brand-700">{label}</p> : null}
        {lowStock ? <p className="text-xs font-medium text-amber-700">Only {product.totalStock} left</p> : null}

        <div className="mt-auto pt-2">
          <p className="text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl">
            {product.variantCount > 1 ? <span className="mr-1 text-xs font-normal text-slate-500">From</span> : null}
            {formatMoney(product.price)}
          </p>
          {saving > 0 && product.compareAtPrice ? <p className="text-xs text-slate-400 line-through tabular-nums">{formatMoney(product.compareAtPrice)}</p> : null}
          {product.inStock ? (
            <button
              type="button"
              onClick={() => (singleVariant && product.defaultVariantId ? void addItem(product.defaultVariantId, 1) : openQuickView(product.slug))}
              disabled={adding}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-60"
              aria-label={singleVariant ? `Add ${product.name} to cart` : `Choose options for ${product.name}`}
            >
              {adding ? <Spinner /> : <PlusIcon size={16} />}
              {singleVariant ? 'Add to cart' : 'Choose options'}
            </button>
          ) : (
            <button type="button" disabled className="mt-3 h-10 w-full cursor-not-allowed rounded-lg bg-slate-100 text-sm font-semibold text-slate-400">
              Sold out
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
