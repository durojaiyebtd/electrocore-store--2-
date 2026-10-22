import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ChevronRightIcon } from '@/components/ui/Icons';
import { fromMinor, getStoreCurrency, convertMinor, BASE_CURRENCY } from '@/lib/currency';
import { site } from '@/lib/site';
import { getProductBySlug, getRelatedProducts } from '@/server/services/catalog.service';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: { title: product.name, description: product.shortDescription, images: [product.images[0]] },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.category.slug, 4);
  const currency = getStoreCurrency();

  // Structured data so search engines can show price & availability
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    brand: { '@type': 'Brand', name: product.brand },
    image: product.images.map((image) => `${site.url}${image}`),
    sku: product.variants[0]?.sku,
    aggregateRating:
      product.reviewCount > 0 ? { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } : undefined,
    offers: product.variants.map((variant) => ({
      '@type': 'Offer',
      sku: variant.sku,
      priceCurrency: currency,
      price: fromMinor(convertMinor(variant.price, BASE_CURRENCY, currency), currency).toFixed(2),
      availability: variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${site.url}/product/${product.slug}`,
      seller: { '@type': 'Organization', name: site.legalName },
    })),
  };

  return (
    <div className="container-page py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-300">
            <ChevronRightIcon size={14} />
          </li>
          <li>
            <Link href="/shop" className="hover:text-slate-900">
              Shop
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-300">
            <ChevronRightIcon size={14} />
          </li>
          <li>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-slate-900">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-300">
            <ChevronRightIcon size={14} />
          </li>
          <li aria-current="page" className="max-w-[16rem] truncate text-slate-700">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductDetailClient product={product} />

      <div className="mt-16 grid gap-12 border-t border-slate-200 pt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="text-xl font-semibold text-slate-900">
            Overview
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-slate-700">{product.description}</p>
          {product.tags.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Related searches">
              {product.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/shop?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {product.specs.length > 0 ? (
          <section aria-labelledby="specs-heading">
            <h2 id="specs-heading" className="text-xl font-semibold text-slate-900">
              Specifications
            </h2>
            <dl className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
              {product.specs.map((spec) => (
                <div key={spec.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm odd:bg-slate-50">
                  <dt className="font-medium text-slate-600">{spec.label}</dt>
                  <dd className="text-slate-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section className="mt-16 border-t border-slate-200 pt-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-semibold tracking-tight text-slate-900">
            You may also need
          </h2>
          <div className="mt-6">
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
