/**
 * Orders: creation from a cart, DTO mapping and lookups.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { generateOrderNumber } from '@/lib/ids';
import { quoteShipping } from '@/lib/shipping';
import type { CheckoutInput } from '@/lib/validators';
import type { Fulfillment, OrderDTO, OrderStatus } from '@/types';
import type { CartWithItems } from './cart.service';
import { PLACEHOLDER_IMAGE } from './catalog.service';

export const orderInclude = {
  items: true,
  transactions: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toOrderDTO(order: OrderWithRelations): OrderDTO {
  const latestTx = order.transactions[0] ?? null;
  return {
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    email: order.email,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
    phone: order.customer.phone,
    shippingAddress: {
      line1: order.shippingAddress.line1,
      line2: order.shippingAddress.line2 ?? null,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      country: order.shippingAddress.country,
    },
    items: order.items.map((item) => ({
      productName: item.productName,
      productSlug: item.productSlug,
      variantName: item.variantName,
      sku: item.sku,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      fulfillment: item.fulfillment as Fulfillment,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    total: order.total,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    payment: latestTx ? { reference: latestTx.reference, channel: latestTx.channel, status: latestTx.status } : null,
  };
}

async function uniqueOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateOrderNumber();
    const taken = await prisma.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw new ApiError(500, 'Could not allocate an order number. Please try again.', 'ORDER_NUMBER_EXHAUSTED');
}

/**
 * Re-checks every cart line against live stock/prices and creates a PENDING order
 * with a snapshot of what is being bought.
 */
export async function createPendingOrder(cart: CartWithItems, input: CheckoutInput, userId: string | null): Promise<OrderWithRelations> {
  if (cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty.', 'CART_EMPTY');
  }

  const problems: Array<{ sku: string; message: string }> = [];
  for (const item of cart.items) {
    const { variant } = item;
    if (!variant.isActive || !variant.product.isActive) {
      problems.push({ sku: variant.sku, message: `${variant.product.name} is no longer available. Please remove it from your cart.` });
    } else if (variant.stock < item.quantity) {
      problems.push({
        sku: variant.sku,
        message:
          variant.stock === 0
            ? `${variant.product.name} (${variant.name}) just sold out. Please remove it from your cart.`
            : `Only ${variant.stock} of ${variant.product.name} (${variant.name}) left. Please reduce the quantity.`,
      });
    }
  }
  if (problems.length > 0) {
    throw new ApiError(409, problems[0].message, 'CART_STOCK_CHANGED', problems);
  }

  const lines = cart.items.map((item) => ({
    productId: item.variant.product.id,
    variantId: item.variant.id,
    productName: item.variant.product.name,
    productSlug: item.variant.product.slug,
    variantName: item.variant.name,
    sku: item.variant.sku,
    image: item.variant.image ?? item.variant.product.images[0] ?? PLACEHOLDER_IMAGE,
    fulfillment: item.variant.product.fulfillment,
    unitPrice: item.variant.price,
    quantity: item.quantity,
    lineTotal: item.variant.price * item.quantity,
  }));

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const hasPhysical = lines.some((line) => line.fulfillment === 'PHYSICAL');
  const shipping = quoteShipping(subtotal, input.address.state, hasPhysical);
  const total = subtotal + shipping.fee;

  const orderNumber = await uniqueOrderNumber();

  return prisma.order.create({
    data: {
      orderNumber,
      userId,
      cartId: cart.id,
      email: input.email,
      customer: { firstName: input.firstName, lastName: input.lastName, phone: input.phone },
      shippingAddress: {
        line1: input.address.line1,
        line2: input.address.line2 || null,
        city: input.address.city,
        state: input.address.state,
        country: 'Nigeria',
        postalCode: input.address.postalCode || null,
      },
      notes: input.notes || null,
      subtotal,
      shippingFee: shipping.fee,
      discount: 0,
      total,
      currency: 'NGN',
      status: 'PENDING',
      events: [{ status: 'PENDING', note: 'Order placed at checkout', actor: 'system', at: new Date() }],
      items: { create: lines },
    },
    include: orderInclude,
  });
}

export async function listOrdersForUser(userId: string): Promise<OrderDTO[]> {
  const orders = await prisma.order.findMany({
    where: { userId, status: { not: 'PENDING' } },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return orders.map(toOrderDTO);
}

export async function getOrderForUser(orderNumber: string, userId: string): Promise<OrderDTO> {
  const order = await prisma.order.findFirst({ where: { orderNumber, userId }, include: orderInclude });
  if (!order) throw new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND');
  return toOrderDTO(order);
}
