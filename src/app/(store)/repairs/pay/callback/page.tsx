import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PayCallbackView } from '@/components/repairs/PayCallbackView';

export const metadata: Metadata = { title: 'Repair payment', robots: { index: false, follow: false } };

export default function RepairPayCallbackPage() {
  return (
    <div className="container-page max-w-2xl py-14">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-slate-900">Repair payment</h1>
      <Suspense fallback={null}><PayCallbackView /></Suspense>
    </div>
  );
}
