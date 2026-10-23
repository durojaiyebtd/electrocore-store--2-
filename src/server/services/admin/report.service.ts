/**
 * Sales reports and CSV exports for the admin portal.
 *
 * Definitions (all amounts NGN kobo, days in Nigerian time):
 * - Gross sales  = total charged on every order paid in the period, including orders refunded later.
 * - Refunds      = total of those orders that were refunded.
 * - Net revenue  = gross sales minus refunds.
 * - Discounts and delivery fees are shown separately; both are already inside the totals.
 */
import type { OrderStatus as PrismaOrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import type { ReportDTO } from '@/types/admin';
import { startOfWatDay, watDayKey } from './dashboard.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAID_STATUSES: PrismaOrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'];
const MAX_RANGE_DAYS = 366;

export interface DateRange {
  from: Date;
  /** Exclusive end: the start of the day after the last day selected */
  to: Date;
  fromKey: string;
  toKey: string;
}

/** Turns "YYYY-MM-DD" strings (Nigerian days) into a time range. Defaults to the last 30 days. */
export function resolveRange(fromKey?: string, toKey?: string): DateRange {
  const today = startOfWatDay();
  const toStart = toKey ? startOfWatDay(new Date(`${toKey}T12:00:00+01:00`)) : today;
  const fromStart = fromKey ? startOfWatDay(new Date(`${fromKey}T12:00:00+01:00`)) : new Date(toStart.getTime() - 29 * DAY_MS);
  if (Number.isNaN(fromStart.getTime()) || Number.isNaN(toStart.getTime())) throw new ApiError(400, 'Enter valid dates.', 'INVALID_DATE');
  if (fromStart.getTime() > toStart.getTime()) throw new ApiError(400, 'The start date must be on or before the end date.', 'INVALID_DATE_RANGE');
  const days = Math.round((toStart.getTime() - fromStart.getTime()) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) throw new ApiError(400, `Choose a range of at most ${MAX_RANGE_DAYS} days.`, 'INVALID_DATE_RANGE');
  return { from: fromStart, to: new Date(toStart.getTime() + DAY_MS), fromKey: watDayKey(fromStart), toKey: watDayKey(toStart) };
}

export async function buildReport(range: DateRange): Promise<ReportDTO> {
  const paidWhere: Prisma.OrderWhereInput = { status: { in: PAID_STATUSES }, paidAt: { gte: range.from, lt: range.to } };

  const [orders, items, failedPayments, channels] = await Promise.all([
    prisma.order.findMany({
      where: paidWhere,
      select: { status: true, total: true, discount: true, shippingFee: true, paidAt: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { is: paidWhere } },
      select: { productName: true, sku: true, quantity: true, lineTotal: true, order: { select: { status: true } } },
    }),
    prisma.paystackTransaction.count({ where: { status: { in: ['FAILED', 'ABANDONED'] }, createdAt: { gte: range.from, lt: range.to } } }),
    prisma.paystackTransaction.findMany({
      where: { status: { in: ['SUCCESS', 'REFUNDED'] }, paidAt: { gte: range.from, lt: range.to } },
      select: { channel: true, amount: true },
    }),
  ]);

  let gross = 0;
  let discounts = 0;
  let shipping = 0;
  let refunds = 0;
  let refundedOrders = 0;
  const byDay = new Map<string, { revenue: number; orders: number }>();
  const byStatus = new Map<string, { orders: number; total: number }>();
  for (let t = range.from.getTime(); t < range.to.getTime(); t += DAY_MS) byDay.set(watDayKey(new Date(t)), { revenue: 0, orders: 0 });

  for (const order of orders) {
    gross += order.total;
    discounts += order.discount;
    shipping += order.shippingFee;
    const refunded = order.status === 'REFUNDED';
    if (refunded) {
      refunds += order.total;
      refundedOrders += 1;
    }
    const status = byStatus.get(order.status) ?? { orders: 0, total: 0 };
    status.orders += 1;
    status.total += order.total;
    byStatus.set(order.status, status);
    if (order.paidAt) {
      const day = byDay.get(watDayKey(order.paidAt));
      if (day) {
        day.orders += 1;
        day.revenue += refunded ? 0 : order.total;
      }
    }
  }

  const products = new Map<string, { productName: string; sku: string; quantity: number; revenue: number }>();
  let unitsSold = 0;
  for (const item of items) {
    if (item.order.status === 'REFUNDED') continue;
    unitsSold += item.quantity;
    const row = products.get(item.sku) ?? { productName: item.productName, sku: item.sku, quantity: 0, revenue: 0 };
    row.quantity += item.quantity;
    row.revenue += item.lineTotal;
    products.set(item.sku, row);
  }

  const byChannel = new Map<string, { payments: number; total: number }>();
  for (const tx of channels) {
    const key = tx.channel ?? 'unknown';
    const row = byChannel.get(key) ?? { payments: 0, total: 0 };
    row.payments += 1;
    row.total += tx.amount;
    byChannel.set(key, row);
  }

  const net = gross - refunds;
  const countedOrders = orders.length - refundedOrders;
  return {
    from: range.fromKey,
    to: range.toKey,
    gross,
    discounts,
    shipping,
    refunds,
    net,
    orders: orders.length,
    refundedOrders,
    unitsSold,
    averageOrderValue: countedOrders > 0 ? Math.round(net / countedOrders) : 0,
    failedPayments,
    byDay: Array.from(byDay.entries()).map(([date, value]) => ({ date, ...value })),
    byStatus: Array.from(byStatus.entries()).map(([status, value]) => ({ status, ...value })),
    byChannel: Array.from(byChannel.entries()).map(([channel, value]) => ({ channel, ...value })),
    topProducts: Array.from(products.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  };
}

// ------------------------------------------------------------------ CSV export

/** Quotes a CSV cell. Cells starting with = + - @ get a leading apostrophe so spreadsheets never run them as formulas. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  // The byte-order mark makes Excel read the file as UTF-8, so names with accents display correctly
  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

const naira = (kobo: number): string => (kobo / 100).toFixed(2);

export async function exportCsv(type: 'orders' | 'transactions' | 'customers' | 'inventory', range: DateRange): Promise<{ filename: string; body: string }> {
  const stamp = `${range.fromKey}_to_${range.toKey}`;

  if (type === 'orders') {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: range.from, lt: range.to } },
      include: { items: true, transactions: { select: { reference: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 20000,
    });
    return {
      filename: `orders_${stamp}.csv`,
      body: toCsv(
        ['Order number', 'Placed (UTC)', 'Status', 'Customer', 'Email', 'Phone', 'Items', 'Units', 'Subtotal (NGN)', 'Discount (NGN)', 'Delivery (NGN)', 'Total (NGN)', 'City', 'State', 'Courier', 'Tracking number', 'Paystack reference'],
        orders.map((o) => [
          o.orderNumber,
          o.createdAt.toISOString(),
          o.status,
          `${o.customer.firstName} ${o.customer.lastName}`,
          o.email,
          o.customer.phone,
          o.items.map((i) => `${i.quantity} x ${i.productName}`).join('; '),
          o.items.reduce((sum, i) => sum + i.quantity, 0),
          naira(o.subtotal),
          naira(o.discount),
          naira(o.shippingFee),
          naira(o.total),
          o.shippingAddress.city,
          o.shippingAddress.state,
          o.courier,
          o.trackingNumber,
          o.transactions[0]?.reference,
        ]),
      ),
    };
  }

  if (type === 'transactions') {
    const rows = await prisma.paystackTransaction.findMany({
      where: { createdAt: { gte: range.from, lt: range.to } },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20000,
    });
    return {
      filename: `transactions_${stamp}.csv`,
      body: toCsv(
        ['Reference', 'Order number', 'Email', 'Amount (NGN)', 'Status', 'Channel', 'Paid at (UTC)', 'Created (UTC)', 'Test payment'],
        rows.map((t) => [t.reference, t.order.orderNumber, t.customerEmail, naira(t.amount), t.status, t.channel, t.paidAt?.toISOString(), t.createdAt.toISOString(), t.isMock]),
      ),
    };
  }

  if (type === 'customers') {
    const users = await prisma.user.findMany({ where: { role: 'CUSTOMER' }, orderBy: { createdAt: 'desc' }, take: 20000 });
    const spend = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { not: null }, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      _sum: { total: true },
      _count: { _all: true },
    });
    const spendByUser = new Map(spend.map((row) => [row.userId, row]));
    return {
      filename: `customers_${watDayKey(new Date())}.csv`,
      // Passwords and payment details are never selected, so they can never leak into an export
      body: toCsv(
        ['Name', 'Email', 'Phone', 'Joined (UTC)', 'Paid orders', 'Total spent (NGN)'],
        users.map((u) => [`${u.firstName} ${u.lastName}`, u.email, u.phone, u.createdAt.toISOString(), spendByUser.get(u.id)?._count._all ?? 0, naira(spendByUser.get(u.id)?._sum.total ?? 0)]),
      ),
    };
  }

  const variants = await prisma.productVariant.findMany({
    include: { product: { select: { name: true, brand: true, isActive: true, category: { select: { name: true } } } } },
    orderBy: [{ stock: 'asc' }],
    take: 20000,
  });
  return {
    filename: `inventory_${watDayKey(new Date())}.csv`,
    body: toCsv(
      ['Product', 'Brand', 'Category', 'Variant', 'SKU', 'Price (NGN)', 'Stock', 'On sale'],
      variants.map((v) => [v.product.name, v.product.brand, v.product.category.name, v.name, v.sku, naira(v.price), v.stock, v.isActive && v.product.isActive]),
    ),
  };
}
