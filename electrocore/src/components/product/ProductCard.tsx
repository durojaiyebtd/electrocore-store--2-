'use client';

import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { EyeIcon, PlusIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { discountPercent } from '@/lib/currency';
import type { ProductSummaryDTO } from '@/types';
import { Price } from './Price';
import { ProductImage } from './ProductImage';
import { Rating } from './Rating';
import { useQuickView } from './QuickViewProvider';

const FULFILLMENT_LABEL: Record<ProductSummaryDTO['fulfillment'], string | null> = {
  PHYSICAL: null,
  DIGITAL: 'Instant licence delivery',
  SERVICE: 'Service booking',
};

export function ProductCard({ product, priority = false }: { product: ProductSummaryDTO; priority?: boolean }) {
  const { addItem, addingVariantId } = useCart();
  const { openQuickView } = useQuickView();
  const saving = discountPercent(product.price, product.compareAtPrice);
  const singleVariant = product.variantCount <= 1 && product.defaultVariantId !== null;
  const adding = addingVariantId !== null && addingVariantId === product.defaultVariantId;
  const label = FULFILLMENT_LABEL[product.fulfillment];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-card">
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <Link href={`/product/${product.slug}`} className="block h-full focus-visible:outline-none" tabIndex={-1} aria-hidden="true">
          <ProductImage
            src={product.image}
            alt=""
            fallbackLabel={product.name}
            loading={priority ? 'eager' : 'lazy'}
            className="h-full w-full object-contain transition duration-300 group-hover:opacity-0"
          />
          {product.hoverImage ? (
            <ProductImage src={product.hoverImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain opacity-0 transition duration-300 group-hover:opacity-100" />
          ) : null}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {saving > 0 ? <span className="rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white">−{saving}%</span> : null}
          {!product.inStock ? <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">Sold out</span> : null}
        </div>
        <button
          type="button"
          onClick={() => openQuickView(product.slug)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-card transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100"
          aria-label={`Quick view ${product.name}`}
        >
          <EyeIcon size={16} />
          Quick view
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium text-slate-500">
          {product.brand} <span className="text-slate-300">/</span> {product.category.name}
        </p>
        <h3 className="text-[0.95rem] font-semibold leading-snug text-slate-900">
          <Link href={`/product/${product.slug}`} className="hover:text-brand-700 focus-visible:underline focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <Rating value={product.rating} count={product.reviewCount} compact />
        {label ? <p className="text-xs font-medium text-brand-700">{label}</p> : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price price={product.price} compareAtPrice={null} prefix={product.variantCount > 1 ? 'From' : undefined} size="sm" />
          {product.inStock ? (
            <button
              type="button"
              onClick={() => (singleVariant && product.defaultVariantId ? void addItem(product.defaultVariantId, 1) : openQuickView(product.slug))}
              disabled={adding}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-white transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-60"
              aria-label={singleVariant ? `Add ${product.name} to cart` : `Choose options for ${product.name}`}
              title={singleVariant ? 'Add to cart' : 'Choose options'}
            >
              {adding ? <Spinner /> : <PlusIcon size={18} />}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
