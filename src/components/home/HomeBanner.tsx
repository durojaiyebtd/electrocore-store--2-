'use client';

/**
 * Wide promotional strip shown under the homepage hero.
 * Uses /images/site/banner.jpg and hides itself if that file is missing,
 * so the homepage never shows a broken image.
 */
import { useEffect, useRef, useState } from 'react';

export function HomeBanner({ image }: { image?: string }) {
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The picture may have failed before React attached onError (server-rendered page), so check once on mount
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setHidden(true);
  }, []);

  if (hidden) return null;
  return (
    <section className="container-page pt-8" aria-label="Our product range">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={image || '/images/site/banner.jpg'}
        alt="Quality products for a smarter tomorrow: laptops and computers, phones and accessories, power and electricity, networking and security, software and licences"
        className="w-full rounded-2xl object-cover shadow-card"
        width={1824}
        height={354}
        onError={() => setHidden(true)}
      />
    </section>
  );
}
