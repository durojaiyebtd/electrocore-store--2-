import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/admin/ui';
import { ReportsView } from '@/components/admin/ReportsView';

export const metadata: Metadata = { title: 'Reports' };

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ReportsView />
    </Suspense>
  );
}
