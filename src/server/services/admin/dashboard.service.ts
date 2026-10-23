/**
 * Numbers for the admin dashboard. Revenue counts only orders that were paid and
 * not later cancelled or refunded. Days are grouped in Nigerian time (WAT, UTC+1).
 */
import type { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { OrderStatus } from '@/types';
import type { DashboardDTO, LowStockDTO } from '@/types/admin';
import { toAdminOrderSummary } from './admin-order.service';

export const REVENUE_STATUSES: PrismaOrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
export const LOW_STOCK_THRESHOLD = 5;
const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of a moment in Nigerian time */
export function watDayKey(date: Date): string {
  return new Date(date.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of the current day in Nigerian time, as a UTC Date */
export function startOfWatDay(now = new Date()): Date {
  const shifted = new Date(now.getTime() + WAT_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - WAT_OFFSET_MS);
}

export async function getLowStock(limit = 10): Promise<LowStockDTO[]> {
  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      stock: { lte: LOW_STOCK_THRESHOLD },
      product: { is: { isActive: true, fulfillment: 'PHYSICAL' } },
    },
    include: { product: { select: { id: true, name: true } } },
    orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
    take: limit,
  });
  return variants.map((variant) => ({
    variantId: variant.id,
    productId: variant.product.id,
    productName: variant.product.name,
    variantName: variant.name,
    sku: variant.sku,
    stock: variant.stock,
  }));
}

export async function getDashboard(): Promise<DashboardDTO> {
  const now = new Date();
  const todayStart = startOfWatDay(now);
  const start7 = new Date(todayStart.getTime() - 6 * DAY_MS);
  const start14 = new Date(todayStart.getTime() - 13 * DAY_MS);
  const start30 = new Date(todayStart.getTime() - 29 * DAY_MS);
  const start60 = new Date(todayStart.getTime() - 59 * DAY_MS);

  const [paidOrders, statusGroups, needsReview, customersTotal, customersNew, recent, lowStock, outOfStockCount, topProducts] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: start60 } },
      select: { total: true, paidAt: true },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.count({ where: { needsReview: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: start30 } } }),
    prisma.order.findMany({
      where: { status: { not: 'PENDING' } },
      include: { items: { select: { quantity: true } }, transactions: { select: { channel: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    getLowStock(8),
    prisma.productVariant.count({
      where: { isActive: true, stock: { lte: 0 }, product: { is: { isActive: true, fulfillment: 'PHYSICAL' } } },
    }),
    prisma.orderItem.groupBy({
      by: ['productName', 'productSlug'],
      where: { order: { is: { status: { in: REVENUE_STATUSES }, paidAt: { gte: start30 } } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    }),
  ]);

  let today = 0;
  let last7 = 0;
  let last30 = 0;
  let previous30 = 0;
  let orders30 = 0;
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 13; i >= 0; i -= 1) {
    byDay.set(watDayKey(new Date(todayStart.getTime() - i * DAY_MS + WAT_OFFSET_MS)), { revenue: 0, orders: 0 });
  }

  for (const order of paidOrders) {
    if (!order.paidAt) continue;
    const t = order.paidAt.getTime();
    if (t >= todayStart.getTime()) today += order.total;
    if (t >= start7.getTime()) last7 += order.total;
    if (t >= start30.getTime()) {
      last30 += order.total;
      orders30 += 1;
    } else {
      previous30 += order.total;
    }
    if (t >= start14.getTime()) {
      const key = watDayKey(order.paidAt);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.revenue += order.total;
        bucket.orders += 1;
      }
    }
  }

  const byStatus = {
    PENDING: 0, PAID: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0, FAILED: 0, REFUNDED: 0,
  } as Record<OrderStatus, number>;
  for (const group of statusGroups) {
    byStatus[group.status as OrderStatus] = group._count._all;
  }

  return {
    revenue: { today, last7Days: last7, last30Days: last30, previous30Days: previous30 },
    orders: {
      last30Days: orders30,
      awaitingFulfilment: byStatus.PAID + byStatus.PROCESSING,
      needsReview,
      byStatus,
    },
    averageOrderValue30Days: orders30 > 0 ? Math.round(last30 / orders30) : 0,
    customers: { total: customersTotal, newLast30Days: customersNew },
    salesByDay: Array.from(byDay.entries()).map(([date, value]) => ({ date, ...value })),
    recentOrders: recent.map(toAdminOrderSummary),
    lowStock,
    outOfStockCount,
    topProducts: topProducts.map((row) => ({
      productName: row.productName,
      productSlug: row.productSlug,
      quantity: row._sum.quantity ?? 0,
      revenue: row._sum.lineTotal ?? 0,
    })),
  };
}
