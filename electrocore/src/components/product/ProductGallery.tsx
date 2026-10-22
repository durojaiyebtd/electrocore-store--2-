'use client';

import { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { ProductImage } from './ProductImage';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  /** Image of the currently selected variant; shown first when present */
  variantImage?: string | null;
  compact?: boolean;
}

export function ProductGallery({ images, alt, variantImage, compact = false }: ProductGalleryProps) {
  const gallery = variantImage ? [variantImage, ...images.filter((image) => image !== variantImage)] : images;
  const [active, setActive] = useState(0);

  // When the shopper picks another colour, jump to that variant's image
  useEffect(() => {
    setActive(0);
  }, [variantImage]);

  const current = gallery[Math.min(active, gallery.length - 1)];
  const go = (delta: number) => setActive((index) => (index + delta + gallery.length) % gallery.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <ProductImage key={current} src={current} alt={alt} fallbackLabel={alt} className="h-full w-full animate-fade-in object-contain" />
        {gallery.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-card transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              aria-label="Previous image"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-card transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              aria-label="Next image"
            >
              <ChevronRightIcon />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white tabular-nums">
              {Math.min(active, gallery.length - 1) + 1} / {gallery.length}
            </span>
          </>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className={cn('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-5')} role="tablist" aria-label="Product images">
          {gallery.map((image, index) => (
            <button
              key={image}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show image ${index + 1}`}
              onClick={() => setActive(index)}
              className={cn(
                'aspect-square overflow-hidden rounded-lg border-2 bg-slate-50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                index === active ? 'border-brand-600' : 'border-transparent hover:border-slate-300',
              )}
            >
              <ProductImage src={image} alt="" className="h-full w-full object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
