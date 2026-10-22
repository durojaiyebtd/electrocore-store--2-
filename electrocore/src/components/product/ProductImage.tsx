'use client';

/**
 * Product photo that never leaves an empty box.
 *
 * If a supplier image link is broken, blocked by the supplier's hotlink
 * protection, or missing, the photo is replaced by a neutral tile that shows
 * the product's own name (so a shopper can still tell the cards apart) instead
 * of a blank square or the browser's broken-image icon.
 */
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';

export const PRODUCT_PLACEHOLDER = '/products/placeholder.svg';

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
  /** Text for the fallback tile, usually the product name. When omitted the generic placeholder picture is used. */
  fallbackLabel?: string;
};

export function ProductImage({ src, alt = '', fallbackLabel, className, onError, ...props }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const usable = src && src !== PRODUCT_PLACEHOLDER ? src : null;

  // A new image (e.g. the shopper picked another variant) gets a fresh attempt
  useEffect(() => {
    setFailed(false);
  }, [src]);

  // A picture can fail before React attaches onError (server-rendered page), so check once it is on screen
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (usable && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...props}
        ref={imgRef}
        className={className}
        src={usable}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
      />
    );
  }

  if (fallbackLabel) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackLabel}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-brand-50 p-4 text-center"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" aria-hidden="true">
          <rect x="4" y="5" width="16" height="11" rx="1.5" />
          <path d="M2 19h20" strokeLinecap="round" />
        </svg>
        <span className="line-clamp-3 text-xs font-medium leading-snug text-slate-600">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} className={className} src={PRODUCT_PLACEHOLDER} alt={alt} />
  );
}
