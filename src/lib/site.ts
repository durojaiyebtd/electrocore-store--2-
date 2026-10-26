/**
 * Business identity & contact details. Values come from environment variables
 * (see .env.example) so they can change without touching code.
 */

function env(name: string, fallback = ''): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

const appUrl = env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000').replace(/\/+$/, '');
const domain = env('NEXT_PUBLIC_SITE_DOMAIN', 'localhost');

/** The one customer-facing contact address (storefront, footer, contact page, policies). */
export const SUPPORT_EMAIL = 'magnificantelectrocoresynergy@gmail.com';

export const site = {
  legalName: 'MAGNIFICENT ELECTROCORE SYNERGY LTD',
  brandName: 'Magnificent ElectroCore',
  shortName: 'ElectroCore',
  rcNumber: '9792926',
  registry: 'Corporate Affairs Commission (CAC), Federal Republic of Nigeria',
  tagline: 'Electronics, computers & engineering services you can trust.',
  description:
    'MAGNIFICENT ELECTROCORE SYNERGY LTD designs, assembles, sells, services and repairs electrical and electronic devices, computers, parts, peripherals, software packages and mobile applications across Nigeria.',
  scope:
    'Manufacturing, designing, developing, assembling, buying, selling, resampling, distributing, marketing, servicing, repairing, altering, and dealing in electrical and electronic devices, gadgets, computers, computer parts, accessories, peripherals, software packages, and mobile applications.',
  url: appUrl,
  domain,
  supportEmail: SUPPORT_EMAIL,
  supportPhone: env('NEXT_PUBLIC_SUPPORT_PHONE'),
  businessHours: env('NEXT_PUBLIC_BUSINESS_HOURS', 'Mon – Sat, 8:00am – 6:00pm WAT'),
  address: {
    line1: env('NEXT_PUBLIC_BUSINESS_ADDRESS_LINE1'),
    city: env('NEXT_PUBLIC_BUSINESS_CITY'),
    state: env('NEXT_PUBLIC_BUSINESS_STATE'),
    country: 'Nigeria',
  },
} as const;

/** One-line address made only of the parts that are configured. */
export function formattedAddress(): string {
  const { line1, city, state, country } = site.address;
  return [line1, city, state, country].filter((part) => part.length > 0).join(', ');
}
