import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RepairTrackView } from '@/components/repairs/RepairTrackView';

export const metadata: Metadata = { title: 'Your repair request', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RepairTrackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <Suspense fallback={null}><RepairTrackView code={code} /></Suspense>
    </div>
  );
}
