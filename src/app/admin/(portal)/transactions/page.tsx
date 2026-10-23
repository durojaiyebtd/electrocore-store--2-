import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/admin/ui';
import { TransactionsView } from '@/components/admin/TransactionsView';

export const metadata: Metadata = { title: 'Transactions' };

export default function AdminTransactionsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <TransactionsView />
    </Suspense>
  );
}
