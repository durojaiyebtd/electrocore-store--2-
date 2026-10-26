/** Admin repair API. Every handler calls requireAdmin() first (the role is re-checked in the database). */
import type { NextRequest } from 'next/server';
import { ok, parseBody, parseQuery, ApiError, type RouteContext } from '@/lib/http';
import { requireAdmin } from '@/lib/admin-auth';
import { listQuerySchema } from '@/lib/admin-validators';
import {
  adminBookingUpdateSchema, adminOfferSchema, adminPaymentSchema, adminRepairUpdateSchema,
  offerResponseSchema, repairMessageSchema, repairerSchema,
} from '@/lib/validators';
import { z } from 'zod';
import * as admin from '../services/admin/admin-repair.service';
import * as repairers from '../services/repairer.service';
import * as payments from '../services/repair-payment.service';
import { cancelBooking, setBookingStatus } from '../services/repairer.service';
import { pickFiles } from '../services/repair-image.service';

type IdCtx = RouteContext<{ id: string }>;

export async function list(req: NextRequest) {
  await requireAdmin();
  const query = parseQuery(req, listQuerySchema.extend({ status: z.string().max(20).optional() }));
  return ok(await admin.listRepairs({ status: query.status, q: query.q, page: query.page, pageSize: query.pageSize }));
}

export async function detail(_req: NextRequest, ctx: IdCtx) {
  await requireAdmin();
  const { id } = await ctx.params;
  return ok({ request: await admin.getRepair(id), payment: payments.paymentOptions() });
}

export async function update(req: NextRequest, ctx: IdCtx) {
  const user = await requireAdmin();
  const { id } = await ctx.params;
  return ok({ request: await admin.adminUpdate(id, user, await parseBody(req, adminRepairUpdateSchema)) });
}

export async function reply(req: NextRequest, ctx: IdCtx) {
  const user = await requireAdmin();
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, 'The message could not be read. Photos may be too large in total.', 'BAD_FORM');
  }
  const { body } = repairMessageSchema.parse({ body: form.get('body') ?? '' });
  return ok({ request: await admin.adminReply(id, user, body, pickFiles(form, 'photos')) });
}

export async function sendOffer(req: NextRequest, ctx: IdCtx) {
  const user = await requireAdmin();
  const { id } = await ctx.params;
  return ok({ request: await admin.adminSendOffer(id, user, await parseBody(req, adminOfferSchema)) });
}

export async function answerOffer(req: NextRequest, ctx: RouteContext<{ id: string; offerId: string }>) {
  await requireAdmin();
  const { id, offerId } = await ctx.params;
  const { action } = await parseBody(req, offerResponseSchema);
  return ok({ request: await admin.adminRespondToOffer(id, offerId, action) });
}

export async function recordPayment(req: NextRequest, ctx: IdCtx) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { amount, method } = await parseBody(req, adminPaymentSchema);
  await payments.recordManualPayment(id, amount, method);
  return ok({ request: await admin.getRepair(id) });
}

export async function updateBooking(req: NextRequest, ctx: RouteContext<{ id: string; bookingId: string }>) {
  await requireAdmin();
  const { id, bookingId } = await ctx.params;
  const { status, reason } = await parseBody(req, adminBookingUpdateSchema);
  if (status === 'CANCELLED') await cancelBooking(id, bookingId, 'admin', reason ?? '');
  else await setBookingStatus(id, bookingId, status);
  return ok({ request: await admin.getRepair(id) });
}

export async function listRepairers() {
  await requireAdmin();
  return ok({ repairers: await repairers.listAllRepairers() });
}

export async function createRepairer(req: NextRequest) {
  await requireAdmin();
  return ok({ repairer: await repairers.createRepairer(await parseBody(req, repairerSchema)) }, { status: 201 });
}

export async function updateRepairer(req: NextRequest, ctx: IdCtx) {
  await requireAdmin();
  const { id } = await ctx.params;
  return ok({ repairer: await repairers.updateRepairer(id, await parseBody(req, repairerSchema)) });
}

export async function deleteRepairer(_req: NextRequest, ctx: IdCtx) {
  await requireAdmin();
  const { id } = await ctx.params;
  return ok(await repairers.removeRepairer(id));
}
