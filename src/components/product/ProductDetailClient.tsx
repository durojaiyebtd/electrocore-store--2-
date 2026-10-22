'use client';

import { useState } from 'react';
import type { ProductDetailDTO, VariantDTO } from '@/types';
import { ProductGallery } from './ProductGallery';
import { PurchasePanel } from './PurchasePanel';
import { Rating } from './Rating';

/** Keeps the gallery in sync with the variant chosen in the purchase panel. */
export function ProductDetailClient({ product }: { product: ProductDetailDTO }) {
  const [variant, setVariant] = useState<VariantDTO | null>(
    product.variants.find((v) => v.isDefault && v.stock > 0) ?? product.variants.find((v) => v.stock > 0) ?? product.variants[0] ?? null,
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
      <ProductGallery images={product.images} alt={product.name} variantImage={variant?.image} />
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-brand-700">{product.brand}</p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.1rem]">{product.name}</h1>
          <div className="mt-3">
            <Rating value={product.rating} count={product.reviewCount} />
          </div>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{product.shortDescription}</p>
        </div>
        <PurchasePanel product={product} onVariantChange={setVariant} />
      </div>
    </div>
  );
}
