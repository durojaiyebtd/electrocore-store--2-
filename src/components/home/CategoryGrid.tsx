import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import { pluralize } from '@/lib/utils';
import type { CategoryDTO } from '@/types';

/** Shop-by-category tiles. Each tile shows a real product photo from that category. */
export function CategoryGrid({ categories, images }: { categories: CategoryDTO[]; images: Record<string, string | undefined> }) {
  if (categories.length === 0) return null;
  return (
    <section className="container-page pt-10 sm:pt-12" aria-labelledby="categories-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-brand-100 pb-3">
        <h2 id="categories-heading" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Shop by category
        </h2>
        <Link href="/shop" className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">
          All products
        </Link>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/shop?category=${category.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <div className="aspect-square bg-white">
                <ProductImage src={images[category.slug]} alt="" fallbackLabel={category.name} loading="lazy" className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105" />
              </div>
              <div className="border-t border-slate-100 bg-brand-50/60 px-3 py-2.5 text-center">
                <span className="block text-sm font-semibold leading-snug text-slate-900">{category.name}</span>
                <span className="block text-xs text-slate-500">{pluralize(category.productCount, 'product')}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
