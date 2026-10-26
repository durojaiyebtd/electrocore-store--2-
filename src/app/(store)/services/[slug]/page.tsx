import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/currency';
import { SERVICES, getService, type Basis } from '@/lib/services-content';
import { formattedAddress, site } from '@/lib/site';
import { getProductBySlug } from '@/server/services/catalog.service';
import { listActiveRepairers } from '@/server/services/repairer.service';
import { paymentOptions } from '@/server/services/repair-payment.service';
import type { RepairerDTO } from '@/types/repair';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  return service ? { title: service.title, description: service.summary } : { title: 'Service' };
}

const BASIS_LABEL: Record<Basis, string> = { listing: 'From our service listing', policy: 'From our published policy', typical: 'Estimate' };
const BASIS_TONE: Record<Basis, string> = { listing: 'bg-emerald-50 text-emerald-800', policy: 'bg-brand-50 text-brand-800', typical: 'bg-amber-50 text-amber-800' };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-slate-200 py-8">
      <h2 id={`${id}-h`} className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3 text-slate-700">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1.5 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch {
    return fallback;
  }
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const [product, repairers] = await Promise.all([
    safe(() => getProductBySlug(service.productSlug), null),
    safe<RepairerDTO[]>(() => listActiveRepairers(), []),
  ]);
  const options = paymentOptions();
  const address = formattedAddress();
  const isRepair = service.kind === 'repair';
  const requestHref = service.kind === 'repair' || service.kind === 'assembly' ? `/repairs/new?service=${service.slug}` : `/product/${service.productSlug}`;
  const onsite = repairers.filter((r) => r.offersOnsite);
  const showVariants = product && product.variants.length > 1;

  const sections = [
    ['overview', 'Overview'], ['devices', 'Supported devices'], ...(service.faults.length ? [['faults', isRepair ? 'Common faults and symptoms' : 'Common reasons to book']] : []),
    ['methods', 'How we work'], ['process', 'Step by step'], ['time', 'Turnaround, warranty and details'], ['pricing', 'Pricing and quotations'],
    ['locations', 'Where we work'], ['benefits', 'Benefits'], ['safety', 'Safety'], ['prepare', 'How to prepare'], ['photos', 'Photo upload tips'],
    ['negotiation', 'How price negotiation works'], ['payment', 'How to pay'], ['policies', 'Booking and cancellation'], ['aftercare', 'After the service'], ['faq', 'FAQs'], ['support', 'Customer support'],
  ].filter((s) => (service.safety.length === 0 ? s[0] !== 'safety' : true)) as Array<[string, string]>;

  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link href="/" className="hover:underline">Home</Link> / <Link href="/services" className="hover:underline">Services</Link> / <span className="text-slate-800">{service.title}</span></nav>
      <header className="mt-4 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{service.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{service.summary}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={requestHref} className="btn-primary">{service.kind === 'development' ? 'Plan your app' : service.kind === 'assembly' ? 'Request a build' : 'Request a repair'}</Link>
          {service.kind !== 'development' ? <Link href={`/repairs/book?service=${service.slug}`} className="btn-secondary">Book a repairer</Link> : null}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_16rem]">
        <article className="min-w-0">
          <Section id="overview" title="Overview"><p className="leading-relaxed">{service.intro}</p></Section>
          <Section id="devices" title="Supported devices"><Bullets items={service.devices} /></Section>
          {service.faults.length ? (
            <Section id="faults" title={isRepair ? 'Common faults and symptoms' : 'Common reasons to book'}>
              <p className="text-sm text-slate-500">Whether a particular fault can be repaired is confirmed at diagnosis.</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                {service.faults.map((f) => (<div key={f.fault} className="rounded-xl border border-slate-200 p-4"><dt className="font-semibold text-slate-900">{f.fault}</dt><dd className="mt-1 text-sm text-slate-600">{f.symptoms}</dd></div>))}
              </dl>
            </Section>
          ) : null}
          <Section id="methods" title="How we work"><Bullets items={service.methods} /></Section>
          <Section id="process" title="Step by step">
            <ol className="space-y-3">
              {service.steps.map((s, i) => (<li key={s.title} className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span><div><p className="font-semibold text-slate-900">{s.title}</p><p className="text-sm text-slate-600">{s.body}</p></div></li>))}
            </ol>
          </Section>
          <Section id="time" title="Turnaround, warranty and details">
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {service.facts.map((f) => (
                <div key={f.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr_auto] sm:items-center">
                  <dt className="font-medium text-slate-900">{f.label}</dt><dd>{f.value}</dd>
                  <dd><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BASIS_TONE[f.basis]}`}>{BASIS_LABEL[f.basis]}</span></dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-slate-500">“Estimate” items are typical, not promises. The real figure is written in your quotation. Read the <Link className="underline" href="/policies/warranty">warranty policy</Link> for full terms.</p>
          </Section>
          <Section id="pricing" title="Pricing and quotations">
            {product ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{service.kind === 'development' ? 'Discovery package price' : 'Diagnostic booking fee'} (current price from our catalogue)</p>
                {showVariants ? (
                  <ul className="mt-2 space-y-1">{product.variants.map((v) => (<li key={v.id} className="flex justify-between gap-4"><span>{v.name}</span><strong className="tabular-nums">{formatMoney(v.price)}</strong></li>))}</ul>
                ) : <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(product.price)}</p>}
              </div>
            ) : <p>The current price is shown on the product page when you order.</p>}
            {isRepair ? (<>
              <p>The booking fee only covers the diagnosis. The repair itself is priced in a <strong>written quotation</strong> based on your photos, your description and the diagnosis, because the cost depends on the fault and the parts. We never start work without your approval. The booking fee is deducted from the final repair bill.</p>
              <p>We do not publish fixed repair prices here, because they would not be reliable for your device.</p>
            </>) : service.kind === 'assembly' ? <p>The build service price is the amount above. Parts are separate unless you buy them from us. Anything extra is written in your quotation first.</p> : <p>The fee is credited in full against the full build if you proceed with us. The full build is priced by the fixed quote you receive.</p>}
          </Section>
          <Section id="locations" title="Where we work">
            <p><strong>Workshop and office:</strong> {address ? address : <>our address is on the <Link className="underline" href="/contact">contact page</Link></>}. Hours: {site.businessHours}.</p>
            {service.kind !== 'development' ? (<>
              <p><strong>Pickup:</strong> our service listing says pickup can be arranged. Ask in your request.</p>
              <p><strong>Home or on-site repair:</strong> only where the repairer you choose offers it. {onsite.length ? 'Currently offered by:' : 'No repairer is currently set up for on-site visits, so repairs are at the workshop for now.'}</p>
              {onsite.length ? <ul className="list-disc space-y-1 pl-5">{onsite.map((r) => <li key={r.id}>{r.name}{r.serviceAreas.length ? `, covering ${r.serviceAreas.join(', ')}` : ''}</li>)}</ul> : null}
            </>) : <p>Discovery sessions are arranged with you after ordering.</p>}
          </Section>
          <Section id="benefits" title="Benefits"><Bullets items={service.benefits} /></Section>
          {service.safety.length ? <Section id="safety" title="Safety"><Bullets items={service.safety} /></Section> : null}
          <Section id="prepare" title="How to prepare"><Bullets items={service.prepare} /></Section>
          <Section id="photos" title="Photo upload tips">
            <Bullets items={['Upload up to 6 photos in JPG, PNG or WebP format, up to 3 MB each.', 'Take photos in good light. Show the damage close up and the whole device.', 'Include a photo of the model label or serial number.', 'Photos are private: only you (through your tracking link) and our team can see them.', 'You can add more photos later in the conversation on your tracking page.']} />
          </Section>
          <Section id="negotiation" title="How price negotiation works">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>We send a written quotation on your tracking page.</li>
              <li>You can accept it, decline it, or send your own price with a note.</li>
              <li>We can accept your price or reply with a new quotation. Only the latest offer is open at any time.</li>
              <li>When one side accepts the other side’s offer, the price is agreed and shown on the request.</li>
              <li>You can message us and share photos throughout. You never have to accept.</li>
            </ol>
          </Section>
          <Section id="payment" title="How to pay">
            <p>After the price is agreed you choose a payment method on your tracking page:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Online</strong> through Paystack{options.paystack ? '.' : ' (not available at the moment).'}</li>
              <li><strong>Bank transfer</strong>{options.bank ? ': the bank details are shown on your tracking page.' : ' (not available at the moment).'}</li>
              <li><strong>At our office</strong> when you drop off or collect the device.</li>
            </ul>
            <p>Bank and office payments are recorded by our team when the money is received. The diagnostic booking fee is deducted from the final repair bill.</p>
          </Section>
          <Section id="policies" title="Booking and cancellation">
            <Bullets items={['Choose a repairer, a date and a time. Appointments must be booked at least one hour ahead, within the repairer’s working hours (West Africa Time).', 'An appointment is “awaiting confirmation” until our team confirms it. You are told on your tracking page.', 'A time slot can only be held by one booking, so you will be asked to choose another time if someone books it first.', 'You can cancel an appointment, or the whole request, from your tracking page until the repair has started. After that, message us.', 'Refund terms for any fee paid are in our terms and returns policy; if your case is unclear, contact support.']} />
            <p className="text-sm"><Link className="underline" href="/policies/terms">Terms of service</Link> · <Link className="underline" href="/policies/returns">Returns & refunds</Link></p>
          </Section>
          <Section id="aftercare" title="After the service"><Bullets items={service.aftercare} /></Section>
          <Section id="faq" title="Frequently asked questions">
            <div className="space-y-3">{service.faqs.map((f) => (<details key={f.q} className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold text-slate-900">{f.q}</summary><p className="mt-2 text-slate-700">{f.a}</p></details>))}</div>
          </Section>
          <Section id="support" title="Customer support">
            <p>Email <a className="font-medium underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>{site.supportPhone ? <> or call {site.supportPhone}</> : null}. Opening hours: {site.businessHours}. Quote your repair reference (RR-…) if you have one.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={requestHref} className="btn-primary">{service.kind === 'development' ? 'Plan your app' : service.kind === 'assembly' ? 'Request a build' : 'Request a repair'}</Link>
              {service.kind !== 'development' ? <Link href={`/repairs/book?service=${service.slug}`} className="btn-secondary">Book a repairer</Link> : null}
              <Link href="/repairs/track" className="btn-secondary">Track a repair</Link>
            </div>
          </Section>
        </article>
        <aside className="hidden lg:block" aria-label="On this page">
          <nav className="sticky top-24 text-sm"><p className="font-semibold text-slate-900">On this page</p><ul className="mt-3 space-y-2">{sections.map(([id, label]) => (<li key={id}><a className="text-slate-600 hover:text-brand-700" href={`#${id}`}>{label}</a></li>))}</ul></nav>
        </aside>
      </div>
    </div>
  );
}
