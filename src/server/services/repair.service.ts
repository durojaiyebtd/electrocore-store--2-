/**
 * Repair requests: creation, private tracking, conversation, quotations and price negotiation.
 * Customers act through a secret access code (their tracking link); administrators go through
 * admin-repair.service.ts, which reuses the shared helpers exported here.
 */
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { getSession } from '@/lib/auth';
import { generateToken, randomCode } from '@/lib/ids';
import { formatMoney } from '@/lib/currency';
import { notifyCustomer, notifyStaff } from '@/lib/repair-notify';
import { MAX_MESSAGE_PHOTOS, REPAIR_CLOSED, REPAIR_STATUS_LABEL, type RepairStatusValue } from '@/lib/repair-constants';
import type { repairRequestSchema } from '@/lib/validators';
import type { RepairBookingDTO, RepairImageDTO, RepairOfferDTO, RepairRequestDTO } from '@/types/repair';
import { saveValidatedImages, validateImages } from './repair-image.service';

type RepairRequestInput = z.infer<typeof repairRequestSchema>;

export type Side = 'CUSTOMER' | 'ADMIN';

/* ------------------------------------------------------------------ helpers */

export async function addEvent(requestId: string, kind: string, note: string, actor: string): Promise<void> {
  await prisma.repairEvent.create({ data: { requestId, kind, note, actor } });
}

function imageUrl(id: string, accessCode: string | null): string {
  return accessCode ? `/api/repairs/images/${id}?code=${accessCode}` : `/api/repairs/images/${id}`;
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/** Builds the full detail view of a request. `forAdmin` adds private notes and uses session-based image URLs. */
export async function buildRequestDTO(row: {
  id: string; reference: string; accessCode: string; name: string; email: string; phone: string; serviceSlug: string; deviceType: string;
  brand: string; model: string; serialNumber: string | null; faultSummary: string; faultDetails: string; serviceMode: string; address: string | null;
  status: string; repairerId: string | null; agreedAmount: number | null; paidAmount: number; paymentMethod: string | null; adminNotes: string | null;
  createdAt: Date; updatedAt: Date;
}, forAdmin: boolean): Promise<RepairRequestDTO> {
  const code = forAdmin ? null : row.accessCode;
  const [images, messages, offers, events, bookings, repairer] = await Promise.all([
    prisma.repairImage.findMany({ where: { requestId: row.id }, select: { id: true, fileName: true, messageId: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.repairMessage.findMany({ where: { requestId: row.id }, orderBy: { createdAt: 'asc' } }),
    prisma.repairOffer.findMany({ where: { requestId: row.id }, orderBy: { createdAt: 'asc' } }),
    prisma.repairEvent.findMany({ where: { requestId: row.id }, orderBy: { createdAt: 'asc' } }),
    prisma.repairBooking.findMany({ where: { requestId: row.id }, orderBy: { startsAt: 'asc' } }),
    row.repairerId ? prisma.repairer.findUnique({ where: { id: row.repairerId }, select: { name: true } }) : Promise.resolve(null),
  ]);
  const repairerIds = Array.from(new Set(bookings.map((b: { repairerId: string }) => b.repairerId)));
  const repairers = repairerIds.length ? await prisma.repairer.findMany({ where: { id: { in: repairerIds } }, select: { id: true, name: true } }) : [];
  const nameById = new Map<string, string>(repairers.map((r: { id: string; name: string }) => [r.id, r.name]));
  const toImage = (img: { id: string; fileName: string | null }): RepairImageDTO => ({ id: img.id, url: imageUrl(img.id, code), fileName: img.fileName });

  return {
    id: row.id,
    reference: row.reference,
    accessCode: forAdmin ? undefined : row.accessCode,
    name: row.name,
    email: row.email,
    phone: row.phone,
    serviceSlug: row.serviceSlug,
    deviceType: row.deviceType,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serialNumber,
    faultSummary: row.faultSummary,
    faultDetails: row.faultDetails,
    serviceMode: row.serviceMode === 'ONSITE' ? 'ONSITE' : 'WORKSHOP',
    address: row.address,
    status: row.status as RepairStatusValue,
    repairerId: row.repairerId,
    repairerName: repairer?.name ?? null,
    agreedAmount: row.agreedAmount,
    paidAmount: row.paidAmount,
    paymentMethod: row.paymentMethod,
    adminNotes: forAdmin ? row.adminNotes : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    images: images.filter((i: { messageId: string | null }) => !i.messageId).map(toImage),
    messages: messages.map((m: { id: string; sender: string; authorName: string; body: string; imageIds: string[]; createdAt: Date }) => ({
      id: m.id,
      sender: m.sender === 'ADMIN' ? ('ADMIN' as const) : ('CUSTOMER' as const),
      authorName: m.authorName,
      body: m.body,
      images: m.imageIds.map((id) => toImage({ id, fileName: images.find((i: { id: string }) => i.id === id)?.fileName ?? null })),
      createdAt: m.createdAt.toISOString(),
    })),
    offers: offers.map((o: { id: string; by: string; amount: number; note: string | null; turnaround: string | null; status: string; createdAt: Date; respondedAt: Date | null }): RepairOfferDTO => ({
      id: o.id,
      by: o.by === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      amount: o.amount,
      note: o.note,
      turnaround: o.turnaround,
      status: o.status as RepairOfferDTO['status'],
      createdAt: o.createdAt.toISOString(),
      respondedAt: iso(o.respondedAt),
    })),
    events: events.map((e: { id: string; kind: string; note: string; actor: string; createdAt: Date }) => ({ id: e.id, kind: e.kind, note: e.note, actor: e.actor, createdAt: e.createdAt.toISOString() })),
    bookings: bookings.map((b: { id: string; reference: string; repairerId: string; startsAt: Date; endsAt: Date; mode: string; address: string | null; status: string; cancelReason: string | null }): RepairBookingDTO => ({
      id: b.id,
      reference: b.reference,
      repairerId: b.repairerId,
      repairerName: nameById.get(b.repairerId) ?? 'Repairer',
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      mode: b.mode === 'ONSITE' ? 'ONSITE' : 'WORKSHOP',
      address: b.address,
      status: b.status as RepairBookingDTO['status'],
      cancelReason: b.cancelReason,
    })),
  };
}

/** Finds a request by its secret code. Always the same "not found" answer, so codes cannot be probed. */
export async function requireByCode(code: string) {
  if (!/^[a-f0-9]{48}$/.test(code)) throw new ApiError(404, 'We could not find that repair request.', 'REPAIR_NOT_FOUND');
  const row = await prisma.repairRequest.findUnique({ where: { accessCode: code } });
  if (!row) throw new ApiError(404, 'We could not find that repair request.', 'REPAIR_NOT_FOUND');
  return row;
}

export function assertOpen(status: string): void {
  if ((REPAIR_CLOSED as readonly string[]).includes(status)) {
    throw new ApiError(409, `This request is ${REPAIR_STATUS_LABEL[status as RepairStatusValue].toLowerCase()} and can no longer be changed.`, 'REPAIR_CLOSED');
  }
}

/* ------------------------------------------------------------------ customer actions */

export async function createRepairRequest(input: RepairRequestInput, files: File[]): Promise<{ id: string; reference: string; accessCode: string }> {
  if (input.serviceMode === 'ONSITE' && !input.address) {
    throw new ApiError(422, 'Enter the address where the repairer should come.', 'ADDRESS_REQUIRED');
  }
  const images = await validateImages(files); // validate everything before saving anything
  const session = await getSession();
  const accessCode = generateToken(24);
  const row = await prisma.repairRequest.create({
    data: {
      reference: `RR-${randomCode(7)}`,
      accessCode,
      userId: session?.userId ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      serviceSlug: input.serviceSlug,
      deviceType: input.deviceType,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber || null,
      faultSummary: input.faultSummary,
      faultDetails: input.faultDetails,
      serviceMode: input.serviceMode,
      address: input.address || null,
    },
  });
  await saveValidatedImages(row.id, images);
  await addEvent(row.id, 'SUBMITTED', `Request submitted with ${images.length} photo${images.length === 1 ? '' : 's'}.`, 'customer');
  notifyStaff(`New repair request ${row.reference}`, `${input.name} submitted a repair request for a ${input.brand} ${input.model}: ${input.faultSummary}`, `/admin/repairs/${row.id}`);
  notifyCustomer(input.email, `We received your repair request ${row.reference}`, `Thank you. We received your repair request for your ${input.brand} ${input.model}. Use the link below to see updates, send photos and negotiate the price.`, accessCode);
  return { id: row.id, reference: row.reference, accessCode };
}

export async function getCustomerRequest(code: string): Promise<RepairRequestDTO> {
  return buildRequestDTO(await requireByCode(code), false);
}

/** Customer types the reference and email; both must match. */
export async function lookupRequest(reference: string, email: string): Promise<{ accessCode: string }> {
  const row = await prisma.repairRequest.findUnique({ where: { reference } });
  if (!row || row.email.toLowerCase() !== email.toLowerCase()) {
    throw new ApiError(404, 'No repair request matches that reference and email.', 'REPAIR_NOT_FOUND');
  }
  return { accessCode: row.accessCode };
}

export async function listMyRequests(): Promise<Array<{ reference: string; accessCode: string; deviceLabel: string; faultSummary: string; status: RepairStatusValue; createdAt: string }>> {
  const session = await getSession();
  if (!session) return [];
  const rows = await prisma.repairRequest.findMany({ where: { userId: session.userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map((r: { reference: string; accessCode: string; brand: string; model: string; faultSummary: string; status: string; createdAt: Date }) => ({
    reference: r.reference,
    accessCode: r.accessCode,
    deviceLabel: `${r.brand} ${r.model}`,
    faultSummary: r.faultSummary,
    status: r.status as RepairStatusValue,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function postMessage(requestId: string, side: Side, authorName: string, body: string, files: File[]): Promise<string> {
  if (!body && files.length === 0) throw new ApiError(422, 'Write a message or attach a photo.', 'EMPTY_MESSAGE');
  const images = await validateImages(files, MAX_MESSAGE_PHOTOS);
  const message = await prisma.repairMessage.create({ data: { requestId, sender: side, authorName, body, imageIds: [] } });
  const imageIds = await saveValidatedImages(requestId, images, message.id);
  if (imageIds.length) await prisma.repairMessage.update({ where: { id: message.id }, data: { imageIds } });
  return message.id;
}

export async function customerMessage(code: string, body: string, files: File[]): Promise<RepairRequestDTO> {
  const row = await requireByCode(code);
  assertOpen(row.status);
  await postMessage(row.id, 'CUSTOMER', row.name, body, files);
  notifyStaff(`New message on ${row.reference}`, `${row.name} wrote: ${body.slice(0, 200) || '(photo attached)'}`, `/admin/repairs/${row.id}`);
  return buildRequestDTO(await requireByCode(code), false);
}

/** Replaces any open offer with a new one from `side`. */
export async function createOffer(requestId: string, side: Side, amount: number, note: string | null, turnaround: string | null) {
  await prisma.repairOffer.updateMany({ where: { requestId, status: 'PENDING' }, data: { status: 'SUPERSEDED', respondedAt: new Date() } });
  return prisma.repairOffer.create({ data: { requestId, by: side, amount, note, turnaround } });
}

export async function customerCounterOffer(code: string, amountKobo: number, note: string): Promise<RepairRequestDTO> {
  const row = await requireByCode(code);
  assertOpen(row.status);
  if (!['SUBMITTED', 'REVIEWING', 'QUOTED', 'NEGOTIATING'].includes(row.status)) {
    throw new ApiError(409, 'The price for this request has already been agreed.', 'PRICE_AGREED');
  }
  await createOffer(row.id, 'CUSTOMER', amountKobo, note || null, null);
  await prisma.repairRequest.update({ where: { id: row.id }, data: { status: 'NEGOTIATING' } });
  await addEvent(row.id, 'OFFER', `Customer proposed ${formatMoney(amountKobo)}.`, 'customer');
  notifyStaff(`Price offer on ${row.reference}`, `${row.name} proposed ${formatMoney(amountKobo)}${note ? `: ${note}` : '.'}`, `/admin/repairs/${row.id}`);
  return buildRequestDTO(await requireByCode(code), false);
}

/**
 * Accept or reject the pending offer. A side may only answer an offer made by the OTHER side.
 * Accepting fixes the agreed price and moves the request to ACCEPTED.
 */
export async function respondToOffer(requestId: string, offerId: string, side: Side, action: 'accept' | 'reject'): Promise<{ accepted: boolean; amount: number }> {
  const request = await prisma.repairRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ApiError(404, 'Repair request not found.', 'REPAIR_NOT_FOUND');
  assertOpen(request.status);
  const offer = await prisma.repairOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.requestId !== requestId) throw new ApiError(404, 'That offer was not found.', 'OFFER_NOT_FOUND');
  if (offer.status !== 'PENDING') throw new ApiError(409, 'That offer has already been answered or replaced.', 'OFFER_CLOSED');
  if (offer.by === side) throw new ApiError(403, 'You cannot answer your own offer. Wait for the other side to respond.', 'OWN_OFFER');

  // Claim the offer so two simultaneous answers cannot both win.
  const claimed = await prisma.repairOffer.updateMany({
    where: { id: offerId, status: 'PENDING' },
    data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED', respondedAt: new Date() },
  });
  if (claimed.count !== 1) throw new ApiError(409, 'That offer has already been answered or replaced.', 'OFFER_CLOSED');

  const actor = side === 'ADMIN' ? 'admin' : 'customer';
  if (action === 'accept') {
    await prisma.repairRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED', agreedAmount: offer.amount } });
    await addEvent(requestId, 'PRICE_AGREED', `Price agreed at ${formatMoney(offer.amount)} (offer accepted by ${actor}).`, actor);
    if (side === 'CUSTOMER') notifyStaff(`Quote accepted on ${request.reference}`, `${request.name} accepted ${formatMoney(offer.amount)}.`, `/admin/repairs/${requestId}`);
    else notifyCustomer(request.email, `Your offer was accepted: ${request.reference}`, `We accepted your price of ${formatMoney(offer.amount)}. Open your request to choose how to pay and book a repairer.`, request.accessCode);
  } else {
    await prisma.repairRequest.update({ where: { id: requestId }, data: { status: 'NEGOTIATING' } });
    await addEvent(requestId, 'OFFER_REJECTED', `${formatMoney(offer.amount)} was declined by ${actor}.`, actor);
    if (side === 'CUSTOMER') notifyStaff(`Quote declined on ${request.reference}`, `${request.name} declined ${formatMoney(offer.amount)}.`, `/admin/repairs/${requestId}`);
    else notifyCustomer(request.email, `Update on your price offer: ${request.reference}`, `We could not accept ${formatMoney(offer.amount)}. Open your request to see our reply and make another offer.`, request.accessCode);
  }
  return { accepted: action === 'accept', amount: offer.amount };
}

export async function customerRespondToOffer(code: string, offerId: string, action: 'accept' | 'reject'): Promise<RepairRequestDTO> {
  const row = await requireByCode(code);
  await respondToOffer(row.id, offerId, 'CUSTOMER', action);
  return buildRequestDTO(await requireByCode(code), false);
}

export async function cancelRequest(requestId: string, actor: 'customer' | 'admin', reason: string): Promise<void> {
  const row = await prisma.repairRequest.findUnique({ where: { id: requestId } });
  if (!row) throw new ApiError(404, 'Repair request not found.', 'REPAIR_NOT_FOUND');
  assertOpen(row.status);
  if (actor === 'customer' && ['IN_PROGRESS', 'READY'].includes(row.status)) {
    throw new ApiError(409, 'The repair has already started. Please message us to cancel.', 'REPAIR_STARTED');
  }
  await prisma.repairOffer.updateMany({ where: { requestId, status: 'PENDING' }, data: { status: 'SUPERSEDED', respondedAt: new Date() } });
  const bookings = await prisma.repairBooking.findMany({ where: { requestId, status: { in: ['PENDING', 'CONFIRMED'] } } });
  for (const booking of bookings) {
    await prisma.repairBooking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelReason: 'Repair request cancelled.', slotKey: `released|${booking.id}` } });
  }
  await prisma.repairRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED' } });
  await addEvent(requestId, 'CANCELLED', reason ? `Request cancelled: ${reason}` : 'Request cancelled.', actor);
  if (actor === 'customer') notifyStaff(`Request cancelled: ${row.reference}`, `${row.name} cancelled the request.${reason ? ` Reason: ${reason}` : ''}`, `/admin/repairs/${requestId}`);
  else notifyCustomer(row.email, `Your repair request ${row.reference} was cancelled`, reason ? `Reason: ${reason}` : 'The request was cancelled by our team.', row.accessCode);
}

export async function customerCancel(code: string, reason: string): Promise<RepairRequestDTO> {
  const row = await requireByCode(code);
  await cancelRequest(row.id, 'customer', reason);
  return buildRequestDTO(await requireByCode(code), false);
}
