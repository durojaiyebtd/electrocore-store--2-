'use client';

/**
 * Homepage hero picture. Shows /images/site/hero.jpg when that file exists and
 * quietly falls back to the built-in laptop illustration when it does not,
 * so the homepage never shows a broken image.
 */
import { useEffect, useRef, useState } from 'react';

const CUSTOM_HERO = '/images/site/hero.jpg';
const FALLBACK_HERO = '/products/electrocore-probook-14-2.svg';

export function HeroImage() {
  const [useFallback, setUseFallback] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The picture may have failed before React attached onError (server-rendered page), so check once on mount
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setUseFallback(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={useFallback ? FALLBACK_HERO : CUSTOM_HERO}
      alt="ElectroCore ProBook 14 laptop on the test bench"
      className="aspect-[4/3] w-full rounded-xl object-cover"
      fetchPriority="high"
      onError={() => setUseFallback(true)}
    />
  );
}
