import type { Metadata } from 'next';
import Link from 'next/link';
import { SERVICES } from '@/lib/services-content';

export const metadata: Metadata = { title: 'Services', description: 'Repairs, data recovery, custom PC assembly and mobile app development from MAGNIFICENT ELECTROCORE SYNERGY LTD.' };

export default function ServicesIndexPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Our services</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">Each service has its own page with what we do, how it works, what it costs and how to start.</p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <li key={s.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900">{s.title}</h2>
            <p className="mt-2 flex-1 text-slate-600">{s.summary}</p>
            <Link href={`/services/${s.slug}`} className="btn-secondary mt-5">Learn more</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
