import type { ProductSummaryDTO } from '@/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductSummaryDTO[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <div className="w-full">
            <ProductCard product={product} priority={index < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="aspect-square animate-pulse bg-slate-100 motion-reduce:animate-none" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}
