/**
 * Storefront text that admins can edit under "Website content". The defaults
 * are what the site showed before this feature existed, so nothing changes
 * until an admin saves something.
 */
import { z } from 'zod';

export interface SiteContent {
  heroEyebrow: string;
  heroHeadline: string;
  heroBody: string;
  heroButtonLabel: string;
  heroButtonHref: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementHref: string;
  /** Wide picture under the hero. Empty = use the built-in banner image. */
  bannerImage: string;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroEyebrow: 'Magnificent ElectroCore',
  heroHeadline: 'Genuine electronics, delivered across Nigeria.',
  heroBody: 'Laptops, phones, power backup and accessories. Pay securely in Naira and get free delivery on orders over ₦500,000.',
  heroButtonLabel: 'Shop now',
  heroButtonHref: '/shop',
  announcementEnabled: false,
  announcementText: '',
  announcementHref: '',
  bannerImage: '',
};

const link = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === '' || (value.startsWith('/') && !value.startsWith('//')) || /^https:\/\//.test(value), 'Links must start with / (a page on this site) or https://.');

export const siteContentSchema = z
  .object({
    heroEyebrow: z.string().trim().max(60),
    heroHeadline: z.string().trim().min(5, 'Add a headline of at least 5 characters.').max(120),
    heroBody: z.string().trim().max(300),
    heroButtonLabel: z.string().trim().min(2, 'Give the button a label.').max(30),
    heroButtonHref: link.refine((value) => value !== '', 'The button needs a link.'),
    announcementEnabled: z.boolean(),
    announcementText: z.string().trim().max(160),
    announcementHref: link,
    bannerImage: link,
  })
  .superRefine((value, ctx) => {
    if (value.announcementEnabled && value.announcementText.length < 3) {
      ctx.addIssue({ code: 'custom', path: ['announcementText'], message: 'Write the announcement text, or switch the bar off.' });
    }
  });
