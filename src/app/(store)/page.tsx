import { AssuranceBar } from '@/components/home/AssuranceBar';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { HomeBanner } from '@/components/home/HomeBanner';
import { HomeHero } from '@/components/home/HomeHero';
import { ProductRow } from '@/components/home/ProductRow';
import { ServicesBand } from '@/components/home/ServicesBand';
import { getSiteContent } from '@/server/services/content.service';
import { getFeaturedProducts, listCategories, listProducts } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

/** How many department rows ("Laptops & Computers", ...) to show under the featured row. */
const DEPARTMENT_ROWS = 4;

export default async function HomePage() {
  const [featured, categories, content] = await Promise.all([getFeaturedProducts(10), listCategories(), getSiteContent()]);

  // One small product list per category: feeds the photo tiles and the department rows
  const populated = categories.filter((category) => category.productCount > 0);
  const perCategory = await Promise.all(
    populated.map(async (category) => {
      const result = await listProducts({ category: category.slug, sort: 'featured', page: 1, pageSize: 5 });
      return { category, items: result.items };
    }),
  );

  const tileImages: Record<string, string | undefined> = {};
  for (const { category, items } of perCategory) tileImages[category.slug] = items.find((item) => item.image)?.image;

  const departments = perCategory.filter((entry) => entry.items.length >= 3).slice(0, DEPARTMENT_ROWS);

  return (
    <>
      <HomeHero categories={populated} spotlight={featured[0] ?? null} content={content} />
      <AssuranceBar />

      {featured.length > 0 ? (
        <ProductRow id="featured" title="Top picks for you" subtitle="Popular laptops, phones and accessories, ready to order." href="/shop" products={featured} priorityCount={5} />
      ) : (
        <p className="container-page mt-10 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
          No products yet. Run <code className="font-mono text-sm">npm run db:seed</code> to load the catalog.
        </p>
      )}

      <CategoryGrid categories={populated.slice(0, 12)} images={tileImages} />
      <HomeBanner image={content.bannerImage} />

      {departments.map(({ category, items }) => (
        <ProductRow key={category.slug} id={`dept-${category.slug}`} title={category.name} href={`/shop?category=${category.slug}`} products={items} />
      ))}

      <div className="pt-12">
        <ServicesBand />
      </div>
    </>
  );
}
