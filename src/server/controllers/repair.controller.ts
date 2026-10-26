/** Customer-facing repair API. Customers are identified by the secret code in their tracking link. */
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, ok, parseBody, parseQuery, type RouteContext } from '@/lib/http';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import {
  bookingCreateSchema, cancelSchema, customerOfferSchema, offerResponseSchema, payMethodSchema,
  repairLookupSchema, repairMessageSchema, repairRequestSchema,
} from '@/lib/validators';
import { z } from 'zod';
import * as repairs from '../services/repair.service';
import * as repairers from '../services/repairer.service';
import * as payments from '../services/repair-payment.service';
import { loadRepairImage, pickFiles } from '../services/repair-image.service';

type CodeCtx = RouteContext<{ code: string }>;

async function readForm(req: NextRequest): Promise<FormData> {
  try {
    return await req.formData();
  } catch {
    throw new ApiError(400, 'The form could not be read. If you attached photos, they may be too large in total.', 'BAD_FORM');
  }
}

function fields(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === 'string') out[key] = value;
  });
  return out;
}

/** POST /api/repairs  (multipart: request fields + up to 6 "photos"; optional repairerId/date/time to book at the same time) */
export async function create(req: NextRequest) {
  rateLimit(`repair-create:${clientIp(req.headers)}`, 6, 60 * 60 * 1000);
  const form = await readForm(req);
  const raw = fields(form);
  const input = repairRequestSchema.parse(raw);
  const created = await repairs.createRepairRequest(input, pickFiles(form, 'photos'));

  let booking: { reference: string } | null = null;
  let bookingError: string | null = null;
  if (raw.repairerId) {
    try {
      const bookingInput = bookingCreateSchema.parse({ repairerId: raw.repairerId, date: raw.date, time: raw.time, mode: input.serviceMode, address: input.address });
      booking = await repairers.createBooking(created.id, bookingInput);
    } catch (error) {
      bookingError = error instanceof ApiError ? error.message : error instanceof z.ZodError ? 'Choose a date and time for the appointment.' : 'The appointment could not be booked.';
    }
  }
  return ok({ reference: created.reference, accessCode: created.accessCode, booking, bookingError }, { status: 201 });
}

/** POST /api/repairs/lookup { reference, email } */
export async function lookup(req: NextRequest) {
  rateLimit(`repair-lookup:${clientIp(req.headers)}`, 10, 15 * 60 * 1000);
  const { reference, email } = await parseBody(req, repairLookupSchema);
  return ok(await repairs.lookupRequest(reference, email));
}

/** GET /api/repairs/my — requests linked to the signed-in account */
export async function mine() {
  return ok({ requests: await repairs.listMyRequests() });
}

/** GET /api/repairs/t/:code */
export async function detail(_req: NextRequest, ctx: CodeCtx) {
  const { code } = await ctx.params;
  return ok({ request: await repairs.getCustomerRequest(code), payment: payments.paymentOptions() });
}

/** POST /api/repairs/t/:code/messages (multipart: body + up to 4 photos) */
export async function message(req: NextRequest, ctx: CodeCtx) {
  const { code } = await ctx.params;
  rateLimit(`repair-msg:${code}`, 30, 60 * 60 * 1000);
  const form = await readForm(req);
  const { body } = repairMessageSchema.parse({ body: form.get('body') ?? '' });
  return ok({ request: await repairs.customerMessage(code, body, pickFiles(form, 'photos')) });
}

/** POST /api/repairs/t/:code/offers { amount (₦), note } — customer counter-offer */
export async function counterOffer(req: NextRequest, ctx: CodeCtx) {
  const { code } = await ctx.params;
  rateLimit(`repair-offer:${code}`, 20, 60 * 60 * 1000);
  const input = await parseBody(req, customerOfferSchema);
  return ok({ request: await repairs.customerCounterOffer(code, input.amount, input.note ?? '') });
}

/** POST /api/repairs/t/:code/offers/:offerId { action } */
export async function answerOffer(req: NextRequest, ctx: RouteContext<{ code: string; offerId: string }>) {
  const { code, offerId } = await ctx.params;
  const { action } = await parseBody(req, offerResponseSchema);
  return ok({ request: await repairs.customerRespondToOffer(code, offerId, action) });
}

/** POST /api/repairs/t/:code/cancel { reason } */
export async function cancel(req: NextRequest, ctx: CodeCtx) {
  const { code } = await ctx.params;
  const { reason } = await parseBody(req, cancelSchema);
  return ok({ request: await repairs.customerCancel(code, reason ?? '') });
}

/** POST /api/repairs/t/:code/bookings { repairerId, date, time, mode, address } */
export async function book(req: NextRequest, ctx: CodeCtx) {
  const { code } = await ctx.params;
  rateLimit(`repair-book:${code}`, 10, 60 * 60 * 1000);
  const row = await repairs.requireByCode(code);
  const input = await parseBody(req, bookingCreateSchema);
  const booking = await repairers.createBooking(row.id, input);
  return ok({ booking, request: await repairs.getCustomerRequest(code) }, { status: 201 });
}

/** POST /api/repairs/t/:code/bookings/:bookingId/cancel { reason } */
export async function cancelBooking(req: NextRequest, ctx: RouteContext<{ code: string; bookingId: string }>) {
  const { code, bookingId } = await ctx.params;
  const row = await repairs.requireByCode(code);
  const { reason } = await parseBody(req, cancelSchema);
  await repairers.cancelBooking(row.id, bookingId, 'customer', reason ?? '');
  return ok({ request: await repairs.getCustomerRequest(code) });
}

/** POST /api/repairs/t/:code/pay { method } */
export async function pay(req: NextRequest, ctx: CodeCtx) {
  const { code } = await ctx.params;
  rateLimit(`repair-pay:${code}`, 15, 60 * 60 * 1000);
  const { method } = await parseBody(req, payMethodSchema);
  const result = await payments.chooseMethod(code, method);
  return ok({ ...result, request: await repairs.getCustomerRequest(code) });
}

/** GET /api/repairs/pay/verify?reference= */
export async function verifyPayment(req: NextRequest) {
  const { reference } = parseQuery(req, z.object({ reference: z.string().trim().min(4).max(60) }));
  return ok(await payments.verifyRepairPayment(reference));
}

/** GET /api/repairs/images/:id?code= — private photos */
export async function image(req: NextRequest, ctx: RouteContext<{ id: string }>) {
  const { id } = await ctx.params;
  const found = await loadRepairImage(id, req.nextUrl.searchParams.get('code'));
  if (!found) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(Buffer.from(found.data), {
    status: 200,
    headers: {
      'Content-Type': found.mimeType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Robots-Tag': 'noindex',
    },
  });
}

/** GET /api/repairers */
export async function listRepairers() {
  return ok({ repairers: await repairers.listActiveRepairers() });
}

/** GET /api/repairers/:id/slots?date=YYYY-MM-DD */
export async function slots(req: NextRequest, ctx: RouteContext<{ id: string }>) {
  const { id } = await ctx.params;
  const { date } = parseQuery(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.') }));
  return ok({ slots: await repairers.getSlots(id, date) });
}
