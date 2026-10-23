/**
 * Paystack transaction log for the admin portal (Admin -> Transactions).
 * Every checkout attempt creates one PaystackTransaction; its status shows whether
 * Paystack confirmed the payment:
 *   SUCCESS      verified with Paystack (by the success page or the signed webhook)
 *   INITIALIZED  customer was sent to Paystack but has not paid (yet)
 *   FAILED / ABANDONED / REVERSED / REFUNDED  as reported by Paystack or set by a refund
 */
import type { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AdminTransactionLogDTO, TransactionLogDTO } from '@/types/admin';

export async function listTransactions(query: {
  q?: string;
  status?: PaymentStatus;
  page: number;
  pageSize: number;
}): Promise<TransactionLogDTO> {
  const where: Prisma.PaystackTransactionWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    const term = query.q.trim();
    where.OR = [
      { reference: { contains: term, mode: 'insensitive' } },
      { customerEmail: { contains: term, mode: 'insensitive' } },
      { order: { is: { orderNumber: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  // Summary uses the search but not the status filter, so the cards stay meaningful while filtering
  const summaryWhere: Prisma.PaystackTransactionWhereInput = query.q ? { OR: where.OR } : {};

  const [total, rows, verified, pendingCount, failedCount] = await Promise.all([
    prisma.paystackTransaction.count({ where }),
    prisma.paystackTransaction.findMany({
      where,
      include: { order: { select: { orderNumber: true, customer: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.paystackTransaction.aggregate({
      where: { ...summaryWhere, status: 'SUCCESS', currency: 'NGN' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.paystackTransaction.count({ where: { ...summaryWhere, status: 'INITIALIZED' } }),
    prisma.paystackTransaction.count({ where: { ...summaryWhere, status: { in: ['FAILED', 'ABANDONED', 'REVERSED'] } } }),
  ]);

  const items: AdminTransactionLogDTO[] = rows.map((tx) => ({
    id: tx.id,
    reference: tx.reference,
    orderNumber: tx.order.orderNumber,
    customerName: `${tx.order.customer.firstName} ${tx.order.customer.lastName}`,
    customerEmail: tx.customerEmail,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status,
    channel: tx.channel ?? null,
    gatewayResponse: tx.gatewayResponse ?? null,
    paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
    createdAt: tx.createdAt.toISOString(),
    isMock: tx.isMock,
  }));

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    summary: {
      verifiedCount: verified._count._all,
      verifiedAmount: verified._sum.amount ?? 0,
      pendingCount,
      failedCount,
    },
  };
}
