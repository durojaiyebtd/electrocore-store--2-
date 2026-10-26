import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminRepairsView } from '@/components/admin/AdminRepairsView';
import { LoadingBlock } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Repair requests' };

export default function AdminRepairsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminRepairsView />
    </Suspense>
  );
}
