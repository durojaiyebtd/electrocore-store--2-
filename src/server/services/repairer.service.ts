/**
 * Repairers, their availability and appointment bookings.
 *
 * Working hours are stored in West Africa Time. A slot is free unless an active (PENDING or
 * CONFIRMED) booking already holds it. Double bookings are prevented by a unique `slotKey` in
 * the database, so two customers clicking the same slot at the same moment cannot both succeed.
 */
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { randomCode } from '@/lib/ids';
import { minutesToClock } from '@/lib/repair-constants';
import { clockToMinutes, formatWatDateTime, isValidDate, todayInWat, watToUtc, weekdayOf } from '@/lib/repair-time';
import { notifyCustomer, notifyStaff } from '@/lib/repair-notify';
import type { bookingCreateSchema, repairerSchema } from '@/lib/validators';
import type { RepairerDTO, SlotDTO } from '@/types/repair';
import { addEvent, assertOpen } from './repair.service';

type BookingInput = z.infer<typeof bookingCreateSchema>;
type RepairerInput = z.infer<typeof repairerSchema>;

/** Slots must be booked at least this far ahead. */
const MIN_NOTICE_MINUTES = 60;
const ACTIVE_BOOKING = ['PENDING', 'CONFIRMED'] as const;

function toDTO(r: {
  id: string; name: string; title: string | null; bio: string | null; phone: string | null; specialities: string[]; serviceAreas: string[];
  offersOnsite: boolean; workDays: number[]; startMinutes: number; endMinutes: number; slotMinutes: number; active: boolean;
}): RepairerDTO {
  return {
    id: r.id, name: r.name, title: r.title, bio: r.bio, phone: r.phone, specialities: r.specialities, serviceAreas: r.serviceAreas,
    offersOnsite: r.offersOnsite, workDays: [...r.workDays].sort(), startMinutes: r.startMinutes, endMinutes: r.endMinutes, slotMinutes: r.slotMinutes, active: r.active,
  };
}

/* ------------------------------------------------------------------ public */

export async function listActiveRepairers(): Promise<RepairerDTO[]> {
  const rows = await prisma.repairer.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return rows.map(toDTO);
}

/** Slot start times (HH:MM) a repairer works on `date`, ignoring bookings. */
export function workingSlots(repairer: { workDays: number[]; startMinutes: number; endMinutes: number; slotMinutes: number }, date: string): number[] {
  if (!isValidDate(date) || !repairer.workDays.includes(weekdayOf(date))) return [];
  const out: number[] = [];
  for (let t = repairer.startMinutes; t + repairer.slotMinutes <= repairer.endMinutes; t += repairer.slotMinutes) out.push(t);
  return out;
}

export async function getSlots(repairerId: string, date: string, now = new Date()): Promise<SlotDTO[]> {
  if (!/^[a-f0-9]{24}$/i.test(repairerId) || !isValidDate(date)) throw new ApiError(400, 'Choose a repairer and a valid date.', 'BAD_SLOT_QUERY');
  const repairer = await prisma.repairer.findUnique({ where: { id: repairerId } });
  if (!repairer || !repairer.active) throw new ApiError(404, 'That repairer is not available.', 'REPAIRER_NOT_FOUND');
  if (date < todayInWat(now)) return [];
  const starts = workingSlots(repairer, date);
  if (starts.length === 0) return [];
  const dayStart = watToUtc(date, 0);
  const dayEnd = watToUtc(date, 1440);
  const booked = await prisma.repairBooking.findMany({
    where: { repairerId, status: { in: [...ACTIVE_BOOKING] }, startsAt: { gte: dayStart, lt: dayEnd } },
    select: { startsAt: true },
  });
  const taken = new Set<number>(booked.map((b: { startsAt: Date }) => b.startsAt.getTime()));
  const earliest = now.getTime() + MIN_NOTICE_MINUTES * 60_000;
  return starts.map((minutes) => {
    const startsAt = watToUtc(date, minutes);
    return { time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`, label: minutesToClock(minutes), available: !taken.has(startsAt.getTime()) && startsAt.getTime() >= earliest };
  });
}

/* ------------------------------------------------------------------ bookings */

export async function createBooking(requestId: string, input: BookingInput, now = new Date()): Promise<{ reference: string }> {
  const request = await prisma.repairRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ApiError(404, 'Repair request not found.', 'REPAIR_NOT_FOUND');
  assertOpen(request.status);
  const existing = await prisma.repairBooking.findFirst({ where: { requestId, status: { in: [...ACTIVE_BOOKING] } } });
  if (existing) throw new ApiError(409, 'This request already has an appointment. Cancel it first to choose another time.', 'ALREADY_BOOKED');

  const repairer = await prisma.repairer.findUnique({ where: { id: input.repairerId } });
  if (!repairer || !repairer.active) throw new ApiError(404, 'That repairer is not available.', 'REPAIRER_NOT_FOUND');
  if (input.mode === 'ONSITE') {
    if (!repairer.offersOnsite) throw new ApiError(422, `${repairer.name} does not offer on-site repairs. Choose the workshop option or another repairer.`, 'NO_ONSITE');
    if (!input.address) throw new ApiError(422, 'Enter the address where the repairer should come.', 'ADDRESS_REQUIRED');
  }

  const minutes = clockToMinutes(input.time);
  if (!isValidDate(input.date) || !workingSlots(repairer, input.date).includes(minutes)) {
    throw new ApiError(422, 'That time is outside this repairer’s working hours.', 'OUTSIDE_HOURS');
  }
  const startsAt = watToUtc(input.date, minutes);
  const endsAt = new Date(startsAt.getTime() + repairer.slotMinutes * 60_000);
  if (startsAt.getTime() < now.getTime() + MIN_NOTICE_MINUTES * 60_000) {
    throw new ApiError(422, 'Please choose a time at least one hour from now.', 'TOO_SOON');
  }

  const reference = `BK-${randomCode(7)}`;
  try {
    await prisma.repairBooking.create({
      data: {
        reference,
        slotKey: `${repairer.id}|${startsAt.toISOString()}`,
        requestId,
        repairerId: repairer.id,
        startsAt,
        endsAt,
        mode: input.mode,
        address: input.mode === 'ONSITE' ? input.address || null : null,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ApiError(409, 'Sorry, that time was just booked by someone else. Please pick another slot.', 'SLOT_TAKEN');
    }
    throw error;
  }
  if (!request.repairerId) await prisma.repairRequest.update({ where: { id: requestId }, data: { repairerId: repairer.id } });
  const when = formatWatDateTime(startsAt);
  await addEvent(requestId, 'BOOKED', `Appointment requested with ${repairer.name} for ${when}.`, 'customer');
  notifyStaff(`New booking ${reference}`, `${request.name} booked ${repairer.name} for ${when} (${input.mode === 'ONSITE' ? 'on-site' : 'workshop'}). Please confirm it.`, `/admin/repairs/${requestId}`);
  notifyCustomer(request.email, `Appointment requested: ${reference}`, `We received your appointment request with ${repairer.name} for ${when}. We will confirm it shortly.`, request.accessCode);
  return { reference };
}

/** Customer or admin cancels an appointment; the slot becomes free again. */
export async function cancelBooking(requestId: string, bookingId: string, actor: 'customer' | 'admin', reason: string): Promise<void> {
  const booking = await prisma.repairBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.requestId !== requestId) throw new ApiError(404, 'Appointment not found.', 'BOOKING_NOT_FOUND');
  if (!ACTIVE_BOOKING.includes(booking.status as 'PENDING' | 'CONFIRMED')) throw new ApiError(409, 'This appointment is already closed.', 'BOOKING_CLOSED');
  await prisma.repairBooking.update({ where: { id: bookingId }, data: { status: 'CANCELLED', cancelReason: reason || null, slotKey: `released|${bookingId}` } });
  const request = await prisma.repairRequest.findUnique({ where: { id: requestId } });
  if (request && request.status === 'SCHEDULED') {
    await prisma.repairRequest.update({ where: { id: requestId }, data: { status: request.agreedAmount != null ? 'ACCEPTED' : 'REVIEWING' } });
  }
  await addEvent(requestId, 'BOOKING_CANCELLED', `Appointment ${booking.reference} cancelled${reason ? `: ${reason}` : '.'}`, actor);
  if (request) {
    if (actor === 'customer') notifyStaff(`Booking cancelled: ${booking.reference}`, `${request.name} cancelled the appointment.${reason ? ` Reason: ${reason}` : ''}`, `/admin/repairs/${requestId}`);
    else notifyCustomer(request.email, `Appointment cancelled: ${booking.reference}`, reason ? `Reason: ${reason}` : 'Your appointment was cancelled by our team. Open your request to choose another time.', request.accessCode);
  }
}

/** Admin confirms or completes an appointment. */
export async function setBookingStatus(requestId: string, bookingId: string, status: 'CONFIRMED' | 'COMPLETED'): Promise<void> {
  const booking = await prisma.repairBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.requestId !== requestId) throw new ApiError(404, 'Appointment not found.', 'BOOKING_NOT_FOUND');
  if (!ACTIVE_BOOKING.includes(booking.status as 'PENDING' | 'CONFIRMED')) throw new ApiError(409, 'This appointment is already closed.', 'BOOKING_CLOSED');
  if (status === 'COMPLETED' && booking.status !== 'CONFIRMED') throw new ApiError(409, 'Confirm the appointment before completing it.', 'NOT_CONFIRMED');
  await prisma.repairBooking.update({ where: { id: bookingId }, data: { status } });
  const request = await prisma.repairRequest.findUnique({ where: { id: requestId } });
  if (status === 'CONFIRMED' && request && ['SUBMITTED', 'REVIEWING', 'QUOTED', 'NEGOTIATING', 'ACCEPTED'].includes(request.status)) {
    await prisma.repairRequest.update({ where: { id: requestId }, data: { status: 'SCHEDULED' } });
  }
  const when = formatWatDateTime(booking.startsAt);
  await addEvent(requestId, status === 'CONFIRMED' ? 'BOOKING_CONFIRMED' : 'BOOKING_COMPLETED', `Appointment ${booking.reference} ${status === 'CONFIRMED' ? 'confirmed' : 'completed'} (${when}).`, 'admin');
  if (request && status === 'CONFIRMED') notifyCustomer(request.email, `Appointment confirmed: ${booking.reference}`, `Your appointment on ${when} is confirmed.`, request.accessCode);
}

/* ------------------------------------------------------------------ admin CRUD */

export async function listAllRepairers(): Promise<RepairerDTO[]> {
  const rows = await prisma.repairer.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  return rows.map(toDTO);
}

function clean(input: RepairerInput) {
  return {
    name: input.name,
    title: input.title || null,
    bio: input.bio || null,
    phone: input.phone || null,
    specialities: input.specialities,
    serviceAreas: input.serviceAreas,
    offersOnsite: input.offersOnsite,
    workDays: Array.from(new Set(input.workDays)).sort(),
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    slotMinutes: input.slotMinutes,
    active: input.active,
  };
}

export async function createRepairer(input: RepairerInput): Promise<RepairerDTO> {
  return toDTO(await prisma.repairer.create({ data: clean(input) }));
}

export async function updateRepairer(id: string, input: RepairerInput): Promise<RepairerDTO> {
  const found = await prisma.repairer.findUnique({ where: { id } });
  if (!found) throw new ApiError(404, 'Repairer not found.', 'REPAIRER_NOT_FOUND');
  return toDTO(await prisma.repairer.update({ where: { id }, data: clean(input) }));
}

/** Repairers with bookings are deactivated, not deleted, so history stays intact. */
export async function removeRepairer(id: string): Promise<{ deleted: boolean }> {
  const found = await prisma.repairer.findUnique({ where: { id } });
  if (!found) throw new ApiError(404, 'Repairer not found.', 'REPAIRER_NOT_FOUND');
  const used = await prisma.repairBooking.findFirst({ where: { repairerId: id } });
  const assigned = await prisma.repairRequest.findFirst({ where: { repairerId: id } });
  if (used || assigned) {
    await prisma.repairer.update({ where: { id }, data: { active: false } });
    return { deleted: false };
  }
  await prisma.repairer.delete({ where: { id } });
  return { deleted: true };
}
