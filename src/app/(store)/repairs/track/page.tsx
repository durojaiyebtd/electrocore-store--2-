import type { Metadata } from 'next';
import { RepairLookupView } from '@/components/repairs/RepairLookupView';

export const metadata: Metadata = { title: 'Track a repair' };

export default function TrackRepairPage() {
  return (
    <div className="container-page max-w-5xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Track a repair</h1>
      <p className="mt-3 text-slate-600">Enter the reference we gave you and the email you used.</p>
      <div className="mt-8"><RepairLookupView /></div>
    </div>
  );
}
