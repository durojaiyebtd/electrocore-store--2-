import { cn } from '@/lib/utils';
import type { ProductSummaryDTO } from '@/types';
import { ProductCard } from './ProductCard';

/** `wide` = up to 5 columns (full-width homepage rows); default = up to 4 (shop page beside the filter column). */
const COLUMNS = {
  default: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  wide: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
} as const;

export function ProductGrid({
  products,
  priorityCount = 0,
  columns = 'default',
}: {
  products: ProductSummaryDTO[];
  priorityCount?: number;
  columns?: keyof typeof COLUMNS;
}) {
  return (
    <ul className={cn('grid gap-3 sm:gap-4', COLUMNS[columns])}>
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
    <ul className={cn('grid gap-3 sm:gap-4', COLUMNS.default)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="aspect-square animate-pulse bg-slate-100 motion-reduce:animate-none" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}
