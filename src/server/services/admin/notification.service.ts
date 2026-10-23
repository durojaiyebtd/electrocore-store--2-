/**
 * Admin notifications. Built live from the real data (orders, stock, payments), so there
 * is nothing separate to keep in sync and nothing that can be out of date.
 */
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/currency';
import type { AdminNotificationDTO } from '@/types/admin';
import { LOW_STOCK_THRESHOLD } from './dashboard.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function listNotifications(): Promise<AdminNotificationDTO[]> {
  const since = new Date(Date.now() - 14 * DAY_MS);

  const [paidOrders, reviewOrders, lowStock, failed, refunded] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'PAID', paidAt: { gte: since } },
      select: { orderNumber: true, total: true, paidAt: true, customer: true },
      orderBy: { paidAt: 'desc' },
      take: 30,
    }),
    prisma.order.findMany({
      where: { needsReview: true },
      select: { orderNumber: true, reviewReason: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, product: { is: { isActive: true, fulfillment: 'PHYSICAL' } } },
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
      take: 30,
    }),
    prisma.paystackTransaction.findMany({
      where: { status: { in: ['FAILED', 'ABANDONED'] }, createdAt: { gte: since } },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.order.findMany({
      where: { status: 'REFUNDED', updatedAt: { gte: since } },
      select: { orderNumber: true, total: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  const items: AdminNotificationDTO[] = [
    ...paidOrders.map((o) => ({
      id: `order-${o.orderNumber}`,
      kind: 'new_order' as const,
      title: `New paid order ${o.orderNumber}`,
      detail: `${o.customer.firstName} ${o.customer.lastName} paid ${formatMoney(o.total)}. Ready to pack and ship.`,
      href: `/admin/orders/${o.orderNumber}`,
      at: (o.paidAt ?? new Date()).toISOString(),
    })),
    ...reviewOrders.map((o) => ({
      id: `review-${o.orderNumber}`,
      kind: 'review' as const,
      title: `Order ${o.orderNumber} needs review`,
      detail: o.reviewReason ?? 'Flagged for manual review.',
      href: `/admin/orders/${o.orderNumber}`,
      at: o.updatedAt.toISOString(),
    })),
    ...lowStock.map((v) => ({
      id: `stock-${v.id}`,
      kind: (v.stock <= 0 ? 'out_of_stock' : 'low_stock') as 'out_of_stock' | 'low_stock',
      title: v.stock <= 0 ? `${v.product.name} is out of stock` : `${v.product.name} is running low`,
      detail: `${v.name === 'Standard' ? v.sku : `${v.name} · ${v.sku}`} · ${v.stock} left`,
      href: `/admin/products/${v.product.id}`,
      at: v.updatedAt.toISOString(),
    })),
    ...failed.map((t) => ({
      id: `pay-${t.reference}`,
      kind: 'failed_payment' as const,
      title: `Payment ${t.status.toLowerCase()} for ${t.order.orderNumber}`,
      detail: `${t.customerEmail} · ${formatMoney(t.amount)} · ${t.gatewayResponse ?? 'no reason given'}`,
      href: '/admin/transactions?status=' + t.status,
      at: t.createdAt.toISOString(),
    })),
    ...refunded.map((o) => ({
      id: `refund-${o.orderNumber}`,
      kind: 'refund' as const,
      title: `Order ${o.orderNumber} was refunded`,
      detail: `${formatMoney(o.total)} returned to the customer.`,
      href: `/admin/orders/${o.orderNumber}`,
      at: o.updatedAt.toISOString(),
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
