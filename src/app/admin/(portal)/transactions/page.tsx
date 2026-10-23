import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TransactionsView } from '@/components/admin/TransactionsView';
import { LoadingBlock } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Transactions' };

export default function AdminTransactionsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <TransactionsView />
    </Suspense>
  );
}
