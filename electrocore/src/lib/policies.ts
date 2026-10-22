/**
 * Store policy content. These are sensible starting texts for a Nigerian
 * electronics retailer — have them reviewed by your legal adviser before launch.
 */
import { formatMoney } from './currency';
import { freeShippingThreshold, SHIPPING_ZONES } from './shipping';
import { site } from './site';

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Policy {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  sections: PolicySection[];
}

const company = `${site.legalName} (RC No: ${site.rcNumber})`;

export function getPolicies(): Policy[] {
  return [
    {
      slug: 'terms',
      title: 'Terms of service',
      summary: 'The agreement between you and us when you use this website or buy from us.',
      updated: '2026-10-21',
      sections: [
        {
          heading: 'Who we are',
          paragraphs: [
            `This website is operated by ${company}, a company registered with the ${site.registry}. References to "we", "us" and "our" mean ${site.legalName}.`,
          ],
        },
        {
          heading: 'Orders and pricing',
          paragraphs: [
            'All prices are shown in Nigerian Naira and include VAT where applicable. An order is accepted only when payment has been confirmed by our payment provider, Paystack.',
            'If a product is listed at an obviously incorrect price or becomes unavailable after you pay, we will contact you and offer a full refund or an alternative.',
          ],
        },
        {
          heading: 'Payments',
          paragraphs: [
            'Payments are processed by Paystack. We never receive or store your full card details. Your bank may apply its own charges for some payment methods.',
          ],
        },
        {
          heading: 'Services and software',
          paragraphs: [
            'Repair, assembly and development services are scheduled after payment. Booking fees for diagnostics are deducted from the final repair bill. Software licences are subject to the publisher’s end-user licence agreement.',
          ],
        },
        {
          heading: 'Liability',
          paragraphs: [
            'Nothing in these terms limits your statutory rights under the Federal Competition and Consumer Protection Act 2018. Our total liability for any order is limited to the amount you paid for that order, except where the law does not allow such a limit.',
          ],
        },
        {
          heading: 'Governing law',
          paragraphs: ['These terms are governed by the laws of the Federal Republic of Nigeria.'],
        },
      ],
    },
    {
      slug: 'privacy',
      title: 'Privacy policy',
      summary: 'What personal data we collect, why, and the rights you have over it.',
      updated: '2026-10-21',
      sections: [
        {
          heading: 'Data we collect',
          bullets: [
            'Contact details: name, email address, phone number and delivery address.',
            'Order history and the products in your cart.',
            'Payment confirmations from Paystack (we do not receive card numbers).',
            'Technical data such as your browser type, used to keep the site secure.',
          ],
        },
        {
          heading: 'How we use it',
          bullets: [
            'To process, deliver and support your orders, repairs and service bookings.',
            'To honour warranties and respond to your enquiries.',
            'To prevent fraud and meet our legal and tax obligations.',
          ],
        },
        {
          heading: 'Your rights',
          paragraphs: [
            `Under the Nigeria Data Protection Act 2023 you may request access to, correction of, or deletion of your personal data, and object to its processing. Email ${site.supportEmail} and we will respond within 30 days.`,
          ],
        },
        {
          heading: 'Sharing',
          paragraphs: [
            'We share data only with service providers who help us run the business — Paystack for payments and our delivery partners for shipping — and only as much as they need.',
          ],
        },
        {
          heading: 'Cookies',
          paragraphs: [
            'We use essential cookies to keep you signed in and to remember your cart. We do not use advertising cookies.',
          ],
        },
      ],
    },
    {
      slug: 'shipping',
      title: 'Delivery policy',
      summary: 'Where we deliver, how much it costs and how long it takes.',
      updated: '2026-10-21',
      sections: [
        {
          heading: 'Delivery fees',
          paragraphs: [`Orders of ${formatMoney(freeShippingThreshold())} or more are delivered free. Otherwise the fee depends on your state:`],
          bullets: SHIPPING_ZONES.map(
            (zone) =>
              `${zone.label}${zone.states.length > 0 ? ` (${zone.states.join(', ')})` : ''}: ${formatMoney(zone.fee)}, ${zone.eta}.`,
          ),
        },
        {
          heading: 'Software and services',
          paragraphs: ['Software licences and service bookings carry no delivery fee. Licence keys are emailed and services are scheduled by phone.'],
        },
        {
          heading: 'Receiving your order',
          paragraphs: [
            'Our dispatch team will call before delivery. Please inspect the package in front of the rider and report visible damage before signing.',
          ],
        },
      ],
    },
    {
      slug: 'returns',
      title: 'Returns & refunds',
      summary: 'How to return an item and when you get your money back.',
      updated: '2026-10-21',
      sections: [
        {
          heading: 'Seven-day returns',
          paragraphs: [
            'You can return most physical products within 7 days of delivery if they are unused, complete and in their original packaging.',
          ],
        },
        {
          heading: 'Faulty items',
          paragraphs: [
            'If an item is faulty on arrival, tell us within 7 days. Our engineers will inspect it and we will repair, replace or refund it at no cost to you.',
          ],
        },
        {
          heading: 'Items that cannot be returned',
          bullets: ['Activated software licences and digital downloads.', 'Services that have already been performed.', 'Items damaged through misuse, liquid or power surges.'],
        },
        {
          heading: 'Refunds',
          paragraphs: ['Approved refunds are sent to your original payment method through Paystack within 5–10 business days.'],
        },
      ],
    },
    {
      slug: 'warranty',
      title: 'Warranty policy',
      summary: 'What our warranties cover and how to make a claim.',
      updated: '2026-10-21',
      sections: [
        {
          heading: 'Coverage',
          paragraphs: [
            'Each product page shows its warranty period. Warranties cover manufacturing defects under normal use and are serviced in our own workshop.',
          ],
        },
        {
          heading: 'Not covered',
          bullets: ['Physical or liquid damage.', 'Damage from power surges where no surge protection was used.', 'Repairs or modifications by third parties.'],
        },
        {
          heading: 'Making a claim',
          paragraphs: [`Email ${site.supportEmail} with your order number and a description of the fault. We will arrange inspection, usually within 48 hours.`],
        },
        {
          heading: 'Repair workmanship',
          paragraphs: ['Repairs carried out by our engineers carry a 90-day workmanship warranty on the parts replaced and work done.'],
        },
      ],
    },
  ];
}

export function getPolicy(slug: string): Policy | undefined {
  return getPolicies().find((policy) => policy.slug === slug);
}
