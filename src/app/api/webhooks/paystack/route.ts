import * as checkoutController from '@/server/controllers/checkout.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Set this URL in Paystack Dashboard → Settings → API Keys & Webhooks:
//   https://YOUR-DOMAIN/api/webhooks/paystack
export const POST = checkoutController.paystackWebhook;
