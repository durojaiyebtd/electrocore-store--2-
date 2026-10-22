import { NextResponse, type NextRequest } from 'next/server';
import { errorResponse, ok, parseBody, parseQuery } from '@/lib/http';
import { checkoutSchema, verifyQuerySchema } from '@/lib/validators';
import { handleWebhook, initializeCheckout, verifyPayment } from '../services/payment.service';

/** POST /api/checkout — validates the form, creates the order and starts a Paystack transaction */
export async function initialize(req: NextRequest) {
  const input = await parseBody(req, checkoutSchema);
  return ok(await initializeCheckout(input), { status: 201 });
}

/** GET /api/checkout/verify?reference=... — called by the success page after Paystack redirects back */
export async function verify(req: NextRequest) {
  const { reference } = parseQuery(req, verifyQuerySchema);
  return ok(await verifyPayment(reference));
}

/**
 * POST /api/webhooks/paystack
 * Paystack expects a quick 200. We return 200 for processed events, 401 for bad
 * signatures and 500 for processing errors (Paystack retries non-200 responses).
 */
export async function paystackWebhook(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  try {
    await handleWebhook(rawBody, signature);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
