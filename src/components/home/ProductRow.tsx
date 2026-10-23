import Link from 'next/link';
import { ProductGrid } from '@/components/product/ProductGrid';
import type { ProductSummaryDTO } from '@/types';

/** A titled row of product cards with a "See all" link, like a marketplace department strip. */
export function ProductRow({
  id,
  title,
  subtitle,
  href,
  products,
  priorityCount = 0,
}: {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  products: ProductSummaryDTO[];
  priorityCount?: number;
}) {
  if (products.length === 0) return null;
  return (
    <section className="container-page pt-10 sm:pt-12" aria-labelledby={`${id}-heading`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-brand-100 pb-3">
        <div>
          <h2 id={`${id}-heading`} className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        <Link href={href} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">
          See all
        </Link>
      </div>
      <div className="mt-5">
        <ProductGrid products={products} columns="wide" priorityCount={priorityCount} />
      </div>
    </section>
  );
}
