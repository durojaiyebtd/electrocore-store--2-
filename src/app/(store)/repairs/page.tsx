import type { Metadata } from 'next';
import Link from 'next/link';
import { SERVICES } from '@/lib/services-content';

export const metadata: Metadata = {
  title: 'Repair services',
  description: 'Request a repair with photos, negotiate the price, book a repairer and track progress.',
};

const ACTIONS = [
  { href: '/repairs/new', title: 'Request a repair', body: 'Upload photos of the damage, describe the fault and get a written quotation. You can negotiate the price with our team before anything starts.' },
  { href: '/repairs/book', title: 'Book a repairer', body: 'See our repairers, their specialities, areas and working hours, then pick a date and time.' },
  { href: '/repairs/track', title: 'Track a repair', body: 'Open your request with your reference and email to read messages, answer quotations and see progress.' },
];

export default function RepairsHubPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Repair services</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">A written quotation comes before any work begins. Nothing is repaired until you agree the price.</p>
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {ACTIONS.map((a) => (
          <li key={a.href} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900">{a.title}</h2>
            <p className="mt-2 flex-1 text-slate-600">{a.body}</p>
            <Link href={a.href} className="btn-primary mt-5">{a.title}</Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-14 text-2xl font-semibold text-slate-900">What we can help with</h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <li key={s.slug} className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.summary}</p>
            <Link href={`/services/${s.slug}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">Learn more about {s.title.toLowerCase()}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
