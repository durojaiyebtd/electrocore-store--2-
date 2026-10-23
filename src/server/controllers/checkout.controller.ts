import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGuestEmail } from '@/lib/guest-checkout';
import { ApiError, errorResponse, ok, parseBody, parseQuery } from '@/lib/http';
import { checkoutSchema, verifyQuerySchema } from '@/lib/validators';
import { handleWebhook, initializeCheckout, verifyPayment } from '../services/payment.service';

/** POST /api/checkout — validates the form, creates the order and starts a Paystack transaction */
export async function initialize(req: NextRequest) {
  // Checkout sign-in gateway: shoppers must be signed in OR have chosen "continue as guest" first.
  const [session, guestEmail] = await Promise.all([getSession(), getGuestEmail()]);
  if (!session && !guestEmail) {
    throw new ApiError(401, 'Please sign in or continue as a guest before paying.', 'CHECKOUT_AUTH_REQUIRED');
  }
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
