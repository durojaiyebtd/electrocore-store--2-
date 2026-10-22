import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CheckIcon } from '@/components/ui/Icons';
import { HeroImage } from './HeroImage';

/**
 * Hero "workbench": circuit traces draw in once and terminate at the product on
 * the bench — a nod to what the company does (design, assembly, repair).
 */
// Drawn in an 80px-wide strip that sits in the gap between the copy and the bench
// card, so traces never cross the headline or body text.
const TRACES: Array<{ d: string; length: number; delay: number }> = [
  { d: 'M0 120 H24 L44 140 H80', length: 110, delay: 0 },
  { d: 'M0 250 H30 L50 230 H80', length: 110, delay: 0.15 },
  { d: 'M0 360 H20 L40 330 H80', length: 110, delay: 0.3 },
  { d: 'M0 470 H28 L48 440 H80', length: 110, delay: 0.45 },
];

const NODES: Array<{ cx: number; cy: number; delay: number }> = [
  { cx: 44, cy: 140, delay: 0.9 },
  { cx: 50, cy: 230, delay: 1.05 },
  { cx: 40, cy: 330, delay: 1.2 },
  { cx: 48, cy: 440, delay: 1.35 },
];

const PROOF = ['Every device inspected before dispatch', 'Secure Paystack checkout in Naira', 'Delivery to all 36 states and the FCT'];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-amber-50 text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f95ea0 1px, transparent 1px), linear-gradient(to bottom, #f95ea0 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-brand-300/50 blur-[120px]" aria-hidden="true" />

      <div className="container-page relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:py-24">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-[2.5rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]">
            Electronics engineered, assembled and serviced for Nigeria.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
            Business laptops, phones, solar and backup power, components and software — sold, installed and repaired by
            the same engineering team.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/shop" className="btn-primary">
              Shop the catalog
            </Link>
            <Link
              href="/shop?category=repair-services"
              className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-brand-600 px-6 text-base font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Book a repair
            </Link>
          </div>
          <ul className="mt-10 grid gap-3 text-sm text-slate-700">
            {PROOF.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-volt-400 text-slate-900">
                  <CheckIcon size={14} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <svg viewBox="0 0 80 560" className="absolute -left-20 top-0 hidden h-full w-20 lg:block" aria-hidden="true" preserveAspectRatio="none">
            {TRACES.map((trace) => (
              <path
                key={trace.d}
                d={trace.d}
                className="hero-trace"
                fill="none"
                stroke="#ec3a85"
                strokeWidth="2"
                style={{ '--trace-length': trace.length, animationDelay: `${trace.delay}s` } as CSSProperties}
              />
            ))}
            {NODES.map((node) => (
              <circle key={`${node.cx}-${node.cy}`} cx={node.cx} cy={node.cy} r="4" fill="#ffd23f" className="hero-node" style={{ animationDelay: `${node.delay}s` }} />
            ))}
          </svg>

          <div className="relative rounded-2xl border border-brand-100 bg-white p-3 shadow-2xl shadow-brand-500/25">
            <div className="flex items-center justify-between px-2 pb-3 pt-1 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Bench test passed
              </span>
              <span className="font-mono">ProBook 14 · burn-in 24h</span>
            </div>
            <HeroImage />
            <dl className="grid grid-cols-3 gap-2 px-1 pt-3 text-center">
              {[
                ['Thermals', '71°C peak'],
                ['Battery', '98% health'],
                ['Display', '0 dead pixels'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-brand-50 px-2 py-2.5">
                  <dt className="text-[0.7rem] text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
