import type { Metadata } from 'next';
import Link from 'next/link';
import { ClockIcon, MailIcon, MapPinIcon, PhoneCallIcon } from '@/components/ui/Icons';
import { formattedAddress, site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact & support',
  description: `Contact ${site.legalName} for sales, repairs, warranty claims and order support.`,
};

export default function ContactPage() {
  const address = formattedAddress();
  const channels = [
    { icon: MailIcon, label: 'Email', value: site.supportEmail, href: `mailto:${site.supportEmail}` },
    ...(site.supportPhone
      ? [{ icon: PhoneCallIcon, label: 'Phone & WhatsApp', value: site.supportPhone, href: `tel:${site.supportPhone.replace(/\s+/g, '')}` }]
      : []),
    ...(address ? [{ icon: MapPinIcon, label: 'Workshop & office', value: address, href: null }] : []),
    { icon: ClockIcon, label: 'Opening hours', value: site.businessHours, href: null },
  ];

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Contact & support</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          For order questions, include your order number (it starts with MES-). For repairs, tell us the device model and what’s wrong.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <li key={channel.label} className="flex gap-4 rounded-xl border border-slate-200 p-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon size={22} />
              </span>
              <div>
                <p className="text-sm text-slate-500">{channel.label}</p>
                {channel.href ? (
                  <a href={channel.href} className="mt-0.5 block font-semibold text-slate-900 hover:text-brand-700">
                    {channel.value}
                  </a>
                ) : (
                  <p className="mt-0.5 font-semibold text-slate-900">{channel.value}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-slate-600">
        Need a repair? <Link href="/product/device-diagnostic-repair-booking" className="font-semibold text-brand-700 underline">Book a diagnosis online</Link> and
        we’ll call you to schedule.
      </p>
    </div>
  );
}
