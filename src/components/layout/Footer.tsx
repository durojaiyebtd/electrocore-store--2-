/**
 * Site footer — the ONLY place for company registration, legal/policy links,
 * business address and contact details.
 */
import Link from 'next/link';
import { ClockIcon, LockIcon, MailIcon, MapPinIcon, PhoneCallIcon } from '@/components/ui/Icons';
import { listCategories } from '@/server/services/catalog.service';
import { formattedAddress, site } from '@/lib/site';
import { CURRENCIES, getStoreCurrency } from '@/lib/currency';
import { Logo } from './Logo';

const COMPANY_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact & support' },
  { href: '/shop?category=repair-services', label: 'Repair & engineering services' },
  { href: '/account', label: 'Track your orders' },
];

const POLICY_LINKS = [
  { href: '/policies/terms', label: 'Terms of service' },
  { href: '/policies/privacy', label: 'Privacy policy' },
  { href: '/policies/shipping', label: 'Delivery policy' },
  { href: '/policies/returns', label: 'Returns & refunds' },
  { href: '/policies/warranty', label: 'Warranty policy' },
];

async function safeCategories() {
  try {
    return (await listCategories()).slice(0, 7);
  } catch {
    return [];
  }
}

export async function Footer() {
  const categories = await safeCategories();
  const year = new Date().getFullYear();
  const address = formattedAddress();

  return (
    <footer className="mt-auto bg-slate-950 text-slate-300" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo inverted />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">{site.description}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {address ? (
                <li className="flex gap-3">
                  <MapPinIcon size={18} className="mt-0.5 shrink-0 text-brand-400" />
                  <span>{address}</span>
                </li>
              ) : null}
              {site.supportPhone ? (
                <li className="flex gap-3">
                  <PhoneCallIcon size={18} className="mt-0.5 shrink-0 text-brand-400" />
                  <a href={`tel:${site.supportPhone.replace(/\s+/g, '')}`} className="hover:text-white">
                    {site.supportPhone}
                  </a>
                </li>
              ) : null}
              <li className="flex gap-3">
                <MailIcon size={18} className="mt-0.5 shrink-0 text-brand-400" />
                <a href={`mailto:${site.supportEmail}`} className="hover:text-white">
                  {site.supportEmail}
                </a>
              </li>
              <li className="flex gap-3">
                <ClockIcon size={18} className="mt-0.5 shrink-0 text-brand-400" />
                <span>{site.businessHours}</span>
              </li>
            </ul>
          </div>

          <nav aria-label="Shop categories" className="lg:col-span-3 lg:col-start-6">
            <h3 className="text-sm font-semibold text-white">Shop</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/shop" className="hover:text-white">
                  All products
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/shop?category=${category.slug}`} className="hover:text-white">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company" className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-white">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Policies" className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-white">Policies</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="font-semibold text-white">{site.legalName}</p>
            <p className="mt-1 text-slate-400">
              RC No: <span className="font-mono text-slate-200">{site.rcNumber}</span>. Registered with the {site.registry}.
            </p>
          </div>
          <p className="flex items-center gap-2 text-slate-400">
            <LockIcon size={18} className="text-brand-400" />
            Payments processed securely by Paystack
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {year} {site.legalName} (RC No: {site.rcNumber}). All rights reserved.
          </p>
          <p>
            Prices shown in {CURRENCIES[getStoreCurrency()].name} ({CURRENCIES[getStoreCurrency()].symbol}).
          </p>
        </div>
      </div>
    </footer>
  );
}
