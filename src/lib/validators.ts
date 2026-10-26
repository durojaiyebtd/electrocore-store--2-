/**
 * Input validation schemas (zod). Used by API controllers; error messages are
 * written for shoppers because they are shown directly in forms.
 */
import { z } from 'zod';
import { isNigerianState } from './shipping';
import { DEVICE_TYPES, REPAIR_SERVICE_SLUGS, SERVICE_MODES } from './repair-constants';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ID.');

/** Nigerian phone numbers: 080..., 070..., 090..., 081..., 091..., or +234 / 234 prefixes. */
const nigerianPhone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine((value) => /^(\+?234|0)[789][01]\d{8}$/.test(value), 'Enter a valid Nigerian phone number, e.g. 0803 123 4567.');

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(500).optional(), // comma-separated slugs
  brand: z.string().trim().max(500).optional(), // comma-separated names
  minPrice: z.coerce.number().min(0).optional(), // major units of store currency
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(['1', 'true', '0', 'false']).optional(),
  featured: z.enum(['1', 'true']).optional(),
  sort: z.enum(['featured', 'newest', 'price_asc', 'price_desc', 'rating']).default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

export const addToCartSchema = z.object({
  variantId: objectId,
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(99, 'Maximum 99 per item.').default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(99),
});

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  firstName: z.string().trim().min(2, 'First name is required.').max(60),
  lastName: z.string().trim().min(2, 'Last name is required.').max(60),
  phone: nigerianPhone,
  address: z.object({
    line1: z.string().trim().min(5, 'Enter your street address.').max(160),
    line2: z.string().trim().max(160).optional().or(z.literal('')),
    city: z.string().trim().min(2, 'Enter your city or town.').max(80),
    state: z.string().refine(isNigerianState, 'Select your state.'),
    postalCode: z.string().trim().max(12).optional().or(z.literal('')),
  }),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter.')
    .regex(/\d/, 'Password must contain a number.'),
  firstName: z.string().trim().min(2, 'First name is required.').max(60),
  lastName: z.string().trim().min(2, 'Last name is required.').max(60),
  phone: nigerianPhone.optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{64}$/, 'This reset link is not valid.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter.')
    .regex(/\d/, 'Password must contain a number.'),
});

export const guestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const verifyQuerySchema = z.object({
  reference: z.string().trim().min(6).max(100).regex(/^[A-Za-z0-9.=-]+$/, 'Invalid payment reference.'),
});

// ---------------------------------------------------------------- repair services

const nairaToKobo = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/[₦,\s]/g, '') : v),
  z.coerce.number().positive('Enter an amount greater than zero.').max(100_000_000, 'That amount is too large.').transform((n) => Math.round(n * 100)),
);

export const repairRequestSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().min(7, 'Enter a phone number we can reach you on.').max(20).regex(/^[0-9+()\-\s]+$/, 'Phone number can only contain digits, spaces, + ( ) and -.'),
  serviceSlug: z.enum(REPAIR_SERVICE_SLUGS),
  deviceType: z.enum(DEVICE_TYPES),
  brand: z.string().trim().min(1, 'Enter the brand.').max(60),
  model: z.string().trim().min(1, 'Enter the model.').max(80),
  serialNumber: z.string().trim().max(60).optional().or(z.literal('')),
  faultSummary: z.string().trim().min(5, 'Give a short title for the fault.').max(120),
  faultDetails: z.string().trim().min(15, 'Describe the fault in a little more detail (at least 15 characters).').max(3000),
  serviceMode: z.enum(SERVICE_MODES).default('WORKSHOP'),
  address: z.string().trim().max(250).optional().or(z.literal('')),
});

export const repairMessageSchema = z.object({
  body: z.string().trim().max(2000).default(''),
});

export const customerOfferSchema = z.object({
  amount: nairaToKobo,
  note: z.string().trim().max(500).optional().or(z.literal('')),
});

export const offerResponseSchema = z.object({ action: z.enum(['accept', 'reject']) });

export const repairLookupSchema = z.object({
  reference: z.string().trim().toUpperCase().min(6).max(30),
  email: z.string().trim().toLowerCase().email('Enter the email you used for the request.'),
});

export const cancelSchema = z.object({ reason: z.string().trim().max(300).optional().or(z.literal('')) });

export const bookingCreateSchema = z.object({
  repairerId: z.string().regex(/^[a-f0-9]{24}$/i, 'Choose a repairer.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.'),
  mode: z.enum(SERVICE_MODES).default('WORKSHOP'),
  address: z.string().trim().max(250).optional().or(z.literal('')),
});

export const payMethodSchema = z.object({ method: z.enum(['PAYSTACK', 'BANK_TRANSFER', 'OFFICE']) });

// Admin side
export const adminMessageSchema = z.object({ body: z.string().trim().min(1, 'Write a message.').max(2000) });
export const adminOfferSchema = z.object({
  amount: nairaToKobo,
  note: z.string().trim().max(500).optional().or(z.literal('')),
  turnaround: z.string().trim().max(120).optional().or(z.literal('')),
});
export const adminRepairUpdateSchema = z.object({
  status: z.enum(['REVIEWING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED']).optional(),
  repairerId: z.string().regex(/^[a-f0-9]{24}$/i).nullable().optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(500).optional(),
});
export const adminBookingUpdateSchema = z.object({ status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']), reason: z.string().trim().max(300).optional() });
export const adminPaymentSchema = z.object({ amount: nairaToKobo, method: z.enum(['BANK_TRANSFER', 'OFFICE', 'PAYSTACK']) });
export const repairerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().max(80).optional().or(z.literal('')),
  bio: z.string().trim().max(600).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  specialities: z.array(z.string().trim().min(1).max(60)).max(15),
  serviceAreas: z.array(z.string().trim().min(1).max(60)).max(20),
  offersOnsite: z.boolean(),
  workDays: z.array(z.number().int().min(0).max(6)).max(7),
  startMinutes: z.number().int().min(0).max(1439),
  endMinutes: z.number().int().min(1).max(1440),
  slotMinutes: z.number().int().refine((n) => [30, 45, 60, 90, 120].includes(n), 'Slot length must be 30, 45, 60, 90 or 120 minutes.'),
  active: z.boolean(),
}).refine((r) => r.endMinutes > r.startMinutes, { message: 'Finish time must be after the start time.', path: ['endMinutes'] });
