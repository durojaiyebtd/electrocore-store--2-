/**
 * Order management for the admin portal: listing, status workflow,
 * cancellations (with restock), Paystack refunds and review resolution.
 */
import type { OrderStatus as PrismaOrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import type { AdminUser } from '@/lib/admin-auth';
import { createRefund } from '@/lib/paystack';
import type { OrderStatus, Fulfillment } from '@/types';
import type { AdminOrderDetailDTO, AdminOrderSummaryDTO, Paginated } from '@/types/admin';
import { restockOrder } from '../inventory.service';

/** Which status an order may move to next. Refunds go through refundOrder(). */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  FAILED: ['CANCELLED'],
  CANCELLED: [],
  REFUNDED: [],
};

const summaryInclude = {
  items: { select: { quantity: true } },
  transactions: { select: { channel: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.OrderInclude;

type OrderForSummary = Prisma.OrderGetPayload<{ include: typeof summaryInclude }>;

const detailInclude = {
  items: true,
  transactions: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

type OrderForDetail = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

export function toAdminOrderSummary(order: OrderForSummary | OrderForDetail): AdminOrderSummaryDTO {
  const items: Array<{ quantity: number }> = order.items;
  const transactions: Array<{ channel: string | null; status: string }> = order.transactions;
  const successful = transactions.find((tx) => tx.status === 'SUCCESS' || tx.status === 'REFUNDED') ?? transactions[0];
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
    email: order.email,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.total,
    needsReview: order.needsReview,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    paymentChannel: successful?.channel ?? null,
  };
}

function toAdminOrderDetail(order: OrderForDetail): AdminOrderDetailDTO {
  const status = order.status as OrderStatus;
  return {
    ...toAdminOrderSummary(order),
    phone: order.customer.phone,
    notes: order.notes ?? null,
    reviewReason: order.reviewReason ?? null,
    restockedAt: order.restockedAt ? order.restockedAt.toISOString() : null,
    isRegisteredCustomer: Boolean(order.userId),
    shippingAddress: {
      line1: order.shippingAddress.line1,
      line2: order.shippingAddress.line2 ?? null,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      country: order.shippingAddress.country,
      postalCode: order.shippingAddress.postalCode ?? null,
    },
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    items: order.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      productSlug: item.productSlug,
      variantName: item.variantName,
      sku: item.sku,
      image: item.image ?? null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      fulfillment: item.fulfillment as Fulfillment,
    })),
    events: [...order.events]
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((event) => ({ status: event.status as OrderStatus, note: event.note ?? null, actor: event.actor, at: event.at.toISOString() })),
    transactions: order.transactions.map((tx) => ({
      reference: tx.reference,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      channel: tx.channel ?? null,
      gatewayResponse: tx.gatewayResponse ?? null,
      paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
      isMock: tx.isMock,
      createdAt: tx.createdAt.toISOString(),
    })),
    allowedTransitions: ALLOWED_TRANSITIONS[status],
    canRefund: Boolean(order.paidAt) && status !== 'REFUNDED',
  };
}

export async function listOrders(query: {
  q?: string;
  status?: OrderStatus;
  review?: '1';
  page: number;
  pageSize: number;
}): Promise<Paginated<AdminOrderSummaryDTO>> {
  const where: Prisma.OrderWhereInput = {};
  if (query.status) {
    where.status = query.status as PrismaOrderStatus;
  } else if (!query.review) {
    // Abandoned checkouts stay out of the default view; the "Awaiting payment" tab shows them
    where.status = { not: 'PENDING' };
  }
  if (query.review) where.needsReview = true;
  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { orderNumber: { contains: q.toUpperCase() } },
      { email: { contains: q.toLowerCase() } },
      { customer: { is: { firstName: { contains: q, mode: 'insensitive' } } } },
      { customer: { is: { lastName: { contains: q, mode: 'insensitive' } } } },
      { customer: { is: { phone: { contains: q.replace(/\s+/g, '') } } } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: summaryInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: orders.map(toAdminOrderSummary),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

async function loadOrder(orderNumber: string): Promise<OrderForDetail> {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: detailInclude });
  if (!order) throw new ApiError(404, `Order ${orderNumber} was not found.`, 'ORDER_NOT_FOUND');
  return order;
}

export async function getOrderDetail(orderNumber: string): Promise<AdminOrderDetailDTO> {
  return toAdminOrderDetail(await loadOrder(orderNumber));
}

export async function updateOrderStatus(
  orderNumber: string,
  input: { status: OrderStatus; note?: string; restock?: boolean },
  admin: AdminUser,
): Promise<AdminOrderDetailDTO> {
  const order = await loadOrder(orderNumber);
  const current = order.status as OrderStatus;
  if (input.status === current) {
    return toAdminOrderDetail(order);
  }
  if (input.status === 'REFUNDED') {
    throw new ApiError(400, 'Use the refund action to refund an order.', 'USE_REFUND');
  }
  if (!ALLOWED_TRANSITIONS[current].includes(input.status)) {
    throw new ApiError(409, `An order that is ${current.toLowerCase()} cannot be moved to ${input.status.toLowerCase()}.`, 'INVALID_TRANSITION');
  }

  // Optimistic concurrency: only update if nobody else changed the status meanwhile
  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: input.status as PrismaOrderStatus },
  });
  if (updated.count === 0) {
    throw new ApiError(409, 'This order was updated by someone else. Refresh to see the latest status.', 'STATUS_CHANGED');
  }

  let note = input.note || null;
  if (input.status === 'CANCELLED' && order.paidAt && input.restock !== false) {
    const restocked = await restockOrder(order.id, admin.email);
    if (restocked) note = [note, 'Items returned to stock.'].filter(Boolean).join(' ');
  }
  if (input.status === 'CANCELLED' && order.paidAt) {
    note = [note, 'Payment was received — issue a refund if the customer is owed money.'].filter(Boolean).join(' ');
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { events: { push: { status: input.status as PrismaOrderStatus, note, actor: admin.email, at: new Date() } } },
  });
  return getOrderDetail(orderNumber);
}

export async function refundOrder(
  orderNumber: string,
  input: { method: 'paystack' | 'manual'; note?: string; restock: boolean },
  admin: AdminUser,
): Promise<AdminOrderDetailDTO> {
  const order = await loadOrder(orderNumber);
  if (!order.paidAt) {
    throw new ApiError(409, 'This order was never paid, so there is nothing to refund.', 'NOT_PAID');
  }
  if (order.status === 'REFUNDED') {
    throw new ApiError(409, 'This order has already been refunded.', 'ALREADY_REFUNDED');
  }

  const transaction = order.transactions.find((tx) => tx.status === 'SUCCESS');
  let refundNote: string;

  if (input.method === 'paystack') {
    if (!transaction) {
      throw new ApiError(409, 'No successful Paystack payment was found for this order. Record a manual refund instead.', 'NO_TRANSACTION');
    }
    if (transaction.isMock) {
      refundNote = 'Refund recorded (mock payment — no money moved).';
    } else {
      const refund = await createRefund(transaction.reference, { merchantNote: input.note || `Refund for order ${orderNumber}` });
      refundNote = `Paystack refund ${refund.status} for ${transaction.currency} ${(refund.amount / 100).toLocaleString('en-NG')}.`;
    }
    await prisma.paystackTransaction.update({
      where: { id: transaction.id },
      data: { status: 'REFUNDED', gatewayResponse: refundNote },
    });
  } else {
    refundNote = 'Refunded outside Paystack (manual).';
  }

  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: 'REFUNDED' },
  });
  if (updated.count === 0) {
    throw new ApiError(409, 'This order was updated by someone else. Refresh and check before refunding again.', 'STATUS_CHANGED');
  }

  if (input.restock) {
    const restocked = await restockOrder(order.id, admin.email);
    if (restocked) refundNote += ' Items returned to stock.';
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      events: { push: { status: 'REFUNDED', note: [refundNote, input.note].filter(Boolean).join(' '), actor: admin.email, at: new Date() } },
    },
  });
  return getOrderDetail(orderNumber);
}

export async function resolveReview(orderNumber: string, note: string, admin: AdminUser): Promise<AdminOrderDetailDTO> {
  const order = await loadOrder(orderNumber);
  if (!order.needsReview) return toAdminOrderDetail(order);
  await prisma.order.update({
    where: { id: order.id },
    data: {
      needsReview: false,
      events: { push: { status: order.status, note: `Review resolved: ${note}`, actor: admin.email, at: new Date() } },
    },
  });
  return getOrderDetail(orderNumber);
}
