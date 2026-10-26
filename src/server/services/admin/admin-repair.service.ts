/** Administrator side of the repair workflow: inbox, conversation, quotations, status, assignment. */
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import type { AdminUser } from '@/lib/admin-auth';
import { formatMoney } from '@/lib/currency';
import { REPAIR_STATUSES, REPAIR_STATUS_LABEL, type RepairStatusValue } from '@/lib/repair-constants';
import { notifyCustomer } from '@/lib/repair-notify';
import type { adminOfferSchema, adminRepairUpdateSchema } from '@/lib/validators';
import type { RepairListItemDTO, RepairRequestDTO } from '@/types/repair';
import { addEvent, assertOpen, buildRequestDTO, cancelRequest, createOffer, postMessage, respondToOffer } from '../repair.service';

export interface RepairListResult {
  items: RepairListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
}

export async function listRepairs(query: { status?: string; q?: string; page: number; pageSize: number }): Promise<RepairListResult> {
  const where: Record<string, unknown> = {};
  if (query.status && (REPAIR_STATUSES as readonly string[]).includes(query.status)) where.status = query.status;
  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { reference: { contains: q.toUpperCase() } },
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { model: { contains: q, mode: 'insensitive' } },
      { brand: { contains: q, mode: 'insensitive' } },
    ];
  }
  const [rows, total, grouped] = await Promise.all([
    prisma.repairRequest.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.repairRequest.count({ where }),
    prisma.repairRequest.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const ids: string[] = rows.map((r: { id: string }) => r.id);
  const repairerIds: string[] = Array.from(new Set<string>(rows.map((r: { repairerId: string | null }) => r.repairerId).filter((v: string | null): v is string => !!v)));
  const [images, messages, offers, repairers] = ids.length
    ? await Promise.all([
        prisma.repairImage.findMany({ where: { requestId: { in: ids }, messageId: null }, select: { requestId: true } }),
        prisma.repairMessage.findMany({ where: { requestId: { in: ids } }, select: { requestId: true, sender: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
        prisma.repairOffer.findMany({ where: { requestId: { in: ids }, status: 'PENDING', by: 'CUSTOMER' }, select: { requestId: true } }),
        repairerIds.length ? prisma.repairer.findMany({ where: { id: { in: repairerIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
      ])
    : [[], [], [], []];
  const photoCount = new Map<string, number>();
  for (const i of images as Array<{ requestId: string }>) photoCount.set(i.requestId, (photoCount.get(i.requestId) ?? 0) + 1);
  const lastSender = new Map<string, string>();
  for (const m of messages as Array<{ requestId: string; sender: string }>) if (!lastSender.has(m.requestId)) lastSender.set(m.requestId, m.sender);
  const pendingCustomerOffer = new Set<string>((offers as Array<{ requestId: string }>).map((o) => o.requestId));
  const nameById = new Map<string, string>((repairers as Array<{ id: string; name: string }>).map((r) => [r.id, r.name]));

  const counts: Record<string, number> = {};
  for (const g of grouped as Array<{ status: string; _count: { _all: number } }>) counts[g.status] = g._count._all;

  const items = rows.map((r: { id: string; reference: string; name: string; email: string; phone: string; brand: string; model: string; faultSummary: string; status: string; agreedAmount: number | null; paidAmount: number; repairerId: string | null; createdAt: Date; updatedAt: Date }): RepairListItemDTO => ({
    id: r.id,
    reference: r.reference,
    name: r.name,
    email: r.email,
    phone: r.phone,
    deviceLabel: `${r.brand} ${r.model}`,
    faultSummary: r.faultSummary,
    status: r.status as RepairStatusValue,
    agreedAmount: r.agreedAmount,
    paidAmount: r.paidAmount,
    repairerName: r.repairerId ? nameById.get(r.repairerId) ?? null : null,
    photoCount: photoCount.get(r.id) ?? 0,
    needsReply: !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(r.status) && (r.status === 'SUBMITTED' || lastSender.get(r.id) === 'CUSTOMER' || pendingCustomerOffer.has(r.id)),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return { items, total, page: query.page, pageSize: query.pageSize, counts };
}

async function requireRow(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new ApiError(404, 'Repair request not found.', 'REPAIR_NOT_FOUND');
  const row = await prisma.repairRequest.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, 'Repair request not found.', 'REPAIR_NOT_FOUND');
  return row;
}

export async function getRepair(id: string): Promise<RepairRequestDTO> {
  return buildRequestDTO(await requireRow(id), true);
}

export async function adminReply(id: string, admin: AdminUser, body: string, files: File[]): Promise<RepairRequestDTO> {
  const row = await requireRow(id);
  assertOpen(row.status);
  await postMessage(id, 'ADMIN', `${admin.firstName} (ElectroCore)`, body, files);
  if (row.status === 'SUBMITTED') await prisma.repairRequest.update({ where: { id }, data: { status: 'REVIEWING' } });
  notifyCustomer(row.email, `New message on your repair request ${row.reference}`, `Our team wrote: ${body.slice(0, 300) || '(photo attached)'}`, row.accessCode);
  return buildRequestDTO(await requireRow(id), true);
}

export async function adminSendOffer(id: string, admin: AdminUser, input: z.infer<typeof adminOfferSchema>): Promise<RepairRequestDTO> {
  const row = await requireRow(id);
  assertOpen(row.status);
  if (!['SUBMITTED', 'REVIEWING', 'QUOTED', 'NEGOTIATING'].includes(row.status)) {
    throw new ApiError(409, 'A price has already been agreed for this request.', 'PRICE_AGREED');
  }
  const hadCustomerOffer = (await prisma.repairOffer.count({ where: { requestId: id, by: 'CUSTOMER' } })) > 0;
  await createOffer(id, 'ADMIN', input.amount, input.note || null, input.turnaround || null);
  await prisma.repairRequest.update({ where: { id }, data: { status: hadCustomerOffer ? 'NEGOTIATING' : 'QUOTED' } });
  await addEvent(id, 'QUOTE', `${admin.firstName} sent a quotation of ${formatMoney(input.amount)}${input.turnaround ? ` (${input.turnaround})` : ''}.`, 'admin');
  notifyCustomer(row.email, `Quotation for your repair ${row.reference}`, `We sent you a quotation of ${formatMoney(input.amount)}. Open your request to accept it, decline it or suggest another price.`, row.accessCode);
  return buildRequestDTO(await requireRow(id), true);
}

export async function adminRespondToOffer(id: string, offerId: string, action: 'accept' | 'reject'): Promise<RepairRequestDTO> {
  await requireRow(id);
  await respondToOffer(id, offerId, 'ADMIN', action);
  return buildRequestDTO(await requireRow(id), true);
}

export async function adminUpdate(id: string, admin: AdminUser, input: z.infer<typeof adminRepairUpdateSchema>): Promise<RepairRequestDTO> {
  const row = await requireRow(id);
  const data: Record<string, unknown> = {};

  if (input.adminNotes !== undefined) data.adminNotes = input.adminNotes || null;

  if (input.repairerId !== undefined) {
    if (input.repairerId) {
      const repairer = await prisma.repairer.findUnique({ where: { id: input.repairerId } });
      if (!repairer) throw new ApiError(404, 'That repairer does not exist.', 'REPAIRER_NOT_FOUND');
      await addEvent(id, 'ASSIGNED', `Assigned to ${repairer.name}.`, 'admin');
    } else {
      await addEvent(id, 'UNASSIGNED', 'Repairer removed from this request.', 'admin');
    }
    data.repairerId = input.repairerId;
  }

  if (input.status && input.status !== row.status) {
    if (input.status === 'CANCELLED') {
      await cancelRequest(id, 'admin', input.note ?? '');
    } else {
      assertOpen(row.status);
      if (['IN_PROGRESS', 'READY', 'COMPLETED'].includes(input.status) && row.agreedAmount == null) {
        throw new ApiError(409, 'Agree a price with the customer before starting the repair.', 'NO_PRICE');
      }
      if (input.status === 'REJECTED') {
        await prisma.repairOffer.updateMany({ where: { requestId: id, status: 'PENDING' }, data: { status: 'SUPERSEDED', respondedAt: new Date() } });
      }
      data.status = input.status;
      const label = REPAIR_STATUS_LABEL[input.status];
      await addEvent(id, 'STATUS', input.note ? `${label}: ${input.note}` : label, 'admin');
      notifyCustomer(row.email, `Update on your repair ${row.reference}: ${label}`, input.note ? `${label}. ${input.note}` : label, row.accessCode);
    }
  }
  if (Object.keys(data).length) await prisma.repairRequest.update({ where: { id }, data });
  void admin;
  return buildRequestDTO(await requireRow(id), true);
}
