import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductsView } from '@/components/admin/ProductsView';
import { LoadingBlock } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Products' };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ProductsView />
    </Suspense>
  );
}
