import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductGridSkeleton } from '@/components/product/ProductGrid';
import { ShopView } from '@/components/shop/ShopView';

export const metadata: Metadata = {
  title: 'Shop electronics, computers & services',
  description: 'Laptops, smartphones, computer parts, power solutions, networking, software and repair services — priced in Naira.',
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-10">
          <ProductGridSkeleton count={8} />
        </div>
      }
    >
      <ShopView />
    </Suspense>
  );
}
