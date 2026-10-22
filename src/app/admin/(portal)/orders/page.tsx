import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersView } from '@/components/admin/OrdersView';
import { LoadingBlock } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Orders' };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <OrdersView />
    </Suspense>
  );
}
