import Link from 'next/link';
import { CATEGORY_ICONS, ChipIcon } from '@/components/ui/Icons';
import { pluralize } from '@/lib/utils';
import type { CategoryDTO } from '@/types';

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="container-page py-14 sm:py-16" aria-labelledby="categories-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="categories-heading" className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Shop by category
        </h2>
        <Link href="/shop" className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
          View all products
        </Link>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.icon ?? ''] ?? ChipIcon;
          return (
            <li key={category.slug}>
              <Link
                href={`/shop?category=${category.slug}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-400 hover:bg-brand-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block font-semibold leading-snug text-slate-900">{category.name}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{pluralize(category.productCount, 'product')}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
