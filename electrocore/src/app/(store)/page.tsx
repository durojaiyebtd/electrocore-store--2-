import Link from 'next/link';
import { AssuranceBar } from '@/components/home/AssuranceBar';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { Hero } from '@/components/home/Hero';
import { ServicesBand } from '@/components/home/ServicesBand';
import { ProductGrid } from '@/components/product/ProductGrid';
import { getFeaturedProducts, listCategories } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featured, categories] = await Promise.all([getFeaturedProducts(8), listCategories()]);

  return (
    <>
      <Hero />
      <AssuranceBar />
      <CategoryGrid categories={categories} />

      <section className="container-page pb-16" aria-labelledby="featured-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="featured-heading" className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Featured products
            </h2>
            <p className="mt-2 text-slate-600">Laptops, tablets and accessories available to order today.</p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
            Browse the full catalog
          </Link>
        </div>
        <div className="mt-8">
          {featured.length > 0 ? (
            <ProductGrid products={featured} priorityCount={4} />
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
              No products yet. Run <code className="font-mono text-sm">npm run db:seed</code> to load the catalog.
            </p>
          )}
        </div>
      </section>

      <ServicesBand />
    </>
  );
}
