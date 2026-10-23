/**
 * Paystack transaction log for the admin portal. Read-only: payments are created
 * by checkout and confirmed by Paystack's webhook, never edited by hand.
 */
import type { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AdminTransactionLogDTO, Paginated } from '@/types/admin';

export async function listTransactions(query: {
  q?: string;
  status?: PaymentStatus;
  page: number;
  pageSize: number;
}): Promise<Paginated<AdminTransactionLogDTO>> {
  const where: Prisma.PaystackTransactionWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { reference: { contains: q } },
      { customerEmail: { contains: q.toLowerCase() } },
      { order: { is: { orderNumber: { contains: q.toUpperCase() } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.paystackTransaction.count({ where }),
    prisma.paystackTransaction.findMany({
      where,
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      orderNumber: row.order.orderNumber,
      customerEmail: row.customerEmail,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      channel: row.channel,
      gatewayResponse: row.gatewayResponse,
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      isMock: row.isMock,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
