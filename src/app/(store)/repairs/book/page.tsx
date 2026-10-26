import type { Metadata } from 'next';
import { RepairRequestForm } from '@/components/repairs/RepairRequestForm';
import { REPAIRABLE_SERVICES } from '@/lib/services-content';

export const metadata: Metadata = { title: 'Book a repairer' };

export default async function BookRepairerPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const options = [...REPAIRABLE_SERVICES.map((s) => ({ slug: s.slug, label: s.title })), { slug: 'other', label: 'Something else' }];
  const initial = options.some((o) => o.slug === service) ? service : undefined;
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Book a repairer</h1>
      <p className="mt-3 text-slate-600">Fill in your device details, then choose a repairer, a date and a time. The appointment is confirmed by our team, and you can follow it on your tracking page.</p>
      <div className="mt-8"><RepairRequestForm services={options} initialService={initial} withBooking /></div>
    </div>
  );
}
