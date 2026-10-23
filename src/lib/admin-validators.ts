/**
 * Validation for admin API input. Prices are entered in whole Naira in the
 * portal and converted to kobo here.
 */
import { z } from 'zod';
import { toMinor } from './currency';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ID.');

export const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED', 'REFUNDED'] as const;

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const orderListQuerySchema = listQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  review: z.enum(['1']).optional(),
});

export const PAYMENT_STATUSES = ['INITIALIZED', 'SUCCESS', 'FAILED', 'ABANDONED', 'REVERSED', 'REFUNDED'] as const;

export const transactionListQuerySchema = listQuerySchema.extend({
  status: z.enum(PAYMENT_STATUSES).optional(),
});

export const productListQuerySchema = listQuerySchema.extend({
  category: objectId.optional(),
  status: z.enum(['active', 'inactive', 'low', 'out']).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
  restock: z.boolean().optional(),
});

export const refundOrderSchema = z.object({
  method: z.enum(['paystack', 'manual']).default('paystack'),
  note: z.string().trim().max(500).optional(),
  restock: z.boolean().default(true),
});

export const resolveReviewSchema = z.object({
  note: z.string().trim().min(3, 'Add a short note on how this was resolved.').max(500),
});

/** Naira (major units, may include kobo decimals) -> kobo integer */
const naira = z.coerce.number().min(0, 'Price cannot be negative.').max(1_000_000_000).transform((value) => toMinor(value));

export const variantInputSchema = z.object({
  id: objectId.optional(),
  sku: z
    .string()
    .trim()
    .min(3, 'Each variant needs a SKU (at least 3 characters).')
    .max(60)
    .regex(/^[A-Za-z0-9._-]+$/, 'SKUs can only contain letters, numbers, dots, dashes and underscores.')
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().max(120).optional().default(''),
  options: z.array(z.object({ name: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(60) })).max(5).default([]),
  price: naira,
  compareAtPrice: naira.nullable().optional(),
  /** Stock for NEW variants only. Existing variants change stock through inventory adjustments (so it is logged). */
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  image: z.string().trim().max(500).nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(3, 'Product name is required.').max(160),
    slug: z
      .string()
      .trim()
      .max(96)
      .regex(/^[a-z0-9-]*$/, 'URL slug can only contain lowercase letters, numbers and dashes.')
      .optional()
      .default(''),
    brand: z.string().trim().min(1, 'Brand is required.').max(60),
    categoryId: objectId,
    shortDescription: z.string().trim().min(10, 'Add a short description (at least 10 characters).').max(300),
    description: z.string().trim().min(20, 'Add a full description (at least 20 characters).').max(8000),
    images: z
      .array(
        z
          .string()
          .trim()
          .refine((value) => value.startsWith('/') || /^https:\/\//.test(value), 'Images must be https:// URLs or paths starting with /.'),
      )
      .max(12)
      .default([]),
    specs: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(300) })).max(40).default([]),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    fulfillment: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']),
    warrantyMonths: z.coerce.number().int().min(0).max(240).default(0),
    featured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    variants: z.array(variantInputSchema).min(1, 'Add at least one variant (price and stock).').max(100),
  })
  .superRefine((value, ctx) => {
    const skus = new Set<string>();
    value.variants.forEach((variant, index) => {
      if (skus.has(variant.sku)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'sku'], message: `SKU ${variant.sku} is used twice.` });
      }
      skus.add(variant.sku);
      if (variant.compareAtPrice !== null && variant.compareAtPrice !== undefined && variant.compareAtPrice > 0 && variant.compareAtPrice <= variant.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', index, 'compareAtPrice'],
          message: `Variant ${variant.sku}: the "was" price must be higher than the selling price.`,
        });
      }
    });
  });
export type ProductInput = z.infer<typeof productInputSchema>;

/**
 * Quick create / edit form in Admin -> Products (a modal with the essentials).
 * Products with several variants (sizes, colours…) are still edited in the full editor.
 */
export const quickProductSchema = z.object({
  name: z.string().trim().min(3, 'Enter a product title (at least 3 characters).').max(160),
  categoryId: objectId,
  /** Optional; when blank the first word of the title is used (e.g. "HP", "Samsung"). */
  brand: z.string().trim().max(60).optional().default(''),
  /** Selling price in whole Naira, converted to kobo. */
  price: z.coerce
    .number({ invalid_type_error: 'Enter the price in Naira, e.g. 250000.' })
    .positive('Enter a price above ₦0.')
    .max(1_000_000_000)
    .transform((value) => toMinor(value)),
  stock: z.coerce
    .number({ invalid_type_error: 'Enter the number of units in stock.' })
    .int('Stock must be a whole number.')
    .min(0, 'Stock cannot be negative.')
    .max(1_000_000),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === '' || value.startsWith('/') || /^https:\/\//.test(value), 'Image URL must start with https:// or with / for a file in your public folder.')
    .optional()
    .default(''),
  specs: z
    .array(z.object({ label: z.string().trim().min(1, 'Each spec needs a name.').max(60), value: z.string().trim().min(1, 'Each spec needs a value.').max(300) }))
    .max(40)
    .default([]),
  description: z.string().trim().max(8000).optional().default(''),
  isActive: z.boolean().default(true),
});
export type QuickProductInput = z.infer<typeof quickProductSchema>;

export const stockAdjustmentSchema = z
  .object({
    variantId: objectId,
    mode: z.enum(['add', 'remove', 'set']),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    reason: z.enum(['RESTOCK', 'ADJUSTMENT', 'RETURN']),
    note: z.string().trim().max(300).optional(),
  })
  .refine((value) => value.mode === 'set' || value.quantity > 0, { message: 'Enter a quantity greater than zero.', path: ['quantity'] });

export const inventoryLogQuerySchema = z.object({
  productId: objectId.optional(),
  variantId: objectId.optional(),
  reason: z.enum(['INITIAL_STOCK', 'SUPPLIER_SYNC', 'SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'OVERSOLD']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, 'Category name is required.').max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'URL slug can only contain lowercase letters, numbers and dashes.')
    .optional()
    .default(''),
  description: z.string().trim().min(5, 'Add a short description.').max(300),
  icon: z.enum(['laptop', 'phone', 'chip', 'keyboard', 'headphones', 'bolt', 'wifi', 'code', 'wrench']).default('chip'),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const customerRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'ADMIN']),
});
