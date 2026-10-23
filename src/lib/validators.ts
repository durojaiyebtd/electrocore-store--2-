/**
 * Input validation schemas (zod). Used by API controllers; error messages are
 * written for shoppers because they are shown directly in forms.
 */
import { z } from 'zod';
import { isNigerianState } from './shipping';

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

export const guestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const verifyQuerySchema = z.object({
  reference: z.string().trim().min(6).max(100).regex(/^[A-Za-z0-9.=-]+$/, 'Invalid payment reference.'),
});
