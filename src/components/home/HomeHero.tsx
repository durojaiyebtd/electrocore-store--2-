import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { SiteContent } from '@/lib/site-content';
import type { CategoryDTO, ProductSummaryDTO } from '@/types';

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/**
 * Marketplace-style top of the homepage: category list on the left, a big promotional
 * panel with a clear product photo in the middle, two promo tiles on the right.
 * On phones the category list becomes a swipeable row of chips.
 */
export function HomeHero({ categories, spotlight, content }: { categories: CategoryDTO[]; spotlight: ProductSummaryDTO | null; content: SiteContent }) {
  return (
    <section className="container-page pt-4 sm:pt-6" aria-label="Featured">
      {/* Phones: swipeable category chips */}
      <ul className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden" aria-label="Categories">
        {categories.map((category) => (
          <li key={category.slug} className="shrink-0">
            <Link href={`/shop?category=${category.slug}`} className="block rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100">
              {category.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_16rem]">
        <nav aria-label="Shop by category" className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
          <p className="bg-brand-600 px-4 py-3 text-sm font-semibold text-white">All categories</p>
          <ul className="divide-y divide-slate-100">
            {categories.slice(0, 10).map((category) => (
              <li key={category.slug}>
                <Link href={`/shop?category=${category.slug}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                  <span className="truncate">{category.name}</span>
                  <Chevron className="shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="relative grid overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white sm:grid-cols-[1.1fr_1fr]">
          <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-volt-400">{content.heroEyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{content.heroHeadline}</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-50 sm:text-base">
              {content.heroBody}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={content.heroButtonHref} className="inline-flex h-12 items-center rounded-lg bg-volt-400 px-6 font-semibold text-slate-900 transition hover:bg-volt-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                {content.heroButtonLabel}
              </Link>
              <Link href="/shop?category=repair-services" className="inline-flex h-12 items-center rounded-lg border-2 border-white/80 px-6 font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Book a repair
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center p-6 pt-0 sm:p-8">
            {spotlight ? (
              <Link href={`/product/${spotlight.slug}`} className="group block w-full max-w-[19rem] rounded-2xl bg-white p-3 text-slate-900 shadow-2xl shadow-brand-950/30 transition hover:-translate-y-1">
                <div className="aspect-square overflow-hidden rounded-xl bg-white">
                  <ProductImage src={spotlight.image} alt={spotlight.name} fallbackLabel={spotlight.name} loading="eager" className="h-full w-full object-contain" />
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-medium">{spotlight.name}</p>
                <p className="text-lg font-bold tabular-nums text-brand-700">{formatMoney(spotlight.price)}</p>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <PromoTile href="/services/device-diagnosis-repair" title="Repairs & installs" body="Screen, battery and board-level repair by our engineers." tone="bg-volt-400/25 border-volt-400" />
          <PromoTile href="/shop" title="Free delivery" body="On orders of ₦500,000 and above, to all 36 states and the FCT." tone="bg-brand-50 border-brand-200" />
        </div>
      </div>
    </section>
  );
}

function PromoTile({ href, title, body, tone }: { href: string; title: string; body: string; tone: string }) {
  return (
    <Link href={href} className={cn('flex flex-col justify-center rounded-2xl border p-5 transition hover:shadow-card', tone)}>
      <p className="text-lg font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-700">{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
        Learn more <Chevron />
      </span>
    </Link>
  );
}
