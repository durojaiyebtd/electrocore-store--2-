import Link from 'next/link';
import { CodeIcon, ChipIcon, WrenchIcon } from '@/components/ui/Icons';

const SERVICES = [
  {
    icon: WrenchIcon,
    title: 'Diagnosis and repair',
    body: 'Screens, batteries, boards, charging ports and data recovery for phones, laptops and desktops. Written quote before any work begins.',
    href: '/product/device-diagnostic-repair-booking',
    cta: 'Book a diagnosis',
  },
  {
    icon: ChipIcon,
    title: 'Custom PC assembly',
    body: 'Bring your parts or buy them here. We build, cable-manage, install the OS and stress-test for 12 hours before handover.',
    href: '/product/custom-pc-assembly-service',
    cta: 'Start a build',
  },
  {
    icon: CodeIcon,
    title: 'Mobile app development',
    body: 'From requirements to a fixed quote in two to three weeks, credited in full when you build with us.',
    href: '/product/mobile-app-development-discovery',
    cta: 'Plan your app',
  },
];

export function ServicesBand() {
  return (
    <section className="border-y border-slate-200 bg-slate-50" aria-labelledby="services-heading">
      <div className="container-page grid gap-10 py-14 sm:py-16 lg:grid-cols-[0.8fr_2fr] lg:gap-14">
        <div>
          <h2 id="services-heading" className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            We fix and build what we sell
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Our workshop engineers handle repairs, upgrades and builds, so the warranty on your device is backed by people who
            can actually open it up.
          </p>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <li key={service.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
                <Icon size={26} className="text-brand-600" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{service.body}</p>
                <Link href={service.href} className="mt-5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
                  {service.cta}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
