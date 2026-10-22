import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About us',
  description: site.description,
};

const CAPABILITIES = [
  { title: 'Design & development', body: 'Hardware configurations, business software packages and Android/iOS mobile applications built to order.' },
  { title: 'Assembly & manufacturing', body: 'Desktops, workstations and power systems assembled and stress-tested in our own workshop.' },
  { title: 'Sales & distribution', body: 'Computers, phones, parts, peripherals and energy equipment sourced from trusted manufacturers and wholesalers.' },
  { title: 'Servicing & repair', body: 'Diagnosis, repair, upgrades and alterations for electrical and electronic devices, backed by written warranties.' },
];

export default function AboutPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Engineers first, retailers second</h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-600">
          {site.brandName} is the trading name of {site.legalName}. We started at the workbench — repairing and assembling devices — and grew
          into a full electronics and technology company serving homes, schools and businesses across Nigeria.
        </p>
        <p className="mt-4 leading-relaxed text-slate-600">Our registered scope covers {site.scope.charAt(0).toLowerCase() + site.scope.slice(1)}</p>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {CAPABILITIES.map((capability) => (
          <li key={capability.title} className="rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">{capability.title}</h2>
            <p className="mt-2 leading-relaxed text-slate-600">{capability.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/shop" className="btn-primary">
          Shop the catalog
        </Link>
        <Link href="/contact" className="btn-secondary">
          Talk to our team
        </Link>
      </div>
    </div>
  );
}
