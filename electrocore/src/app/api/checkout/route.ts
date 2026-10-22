import { withErrorHandling } from '@/lib/http';
import * as checkoutController from '@/server/controllers/checkout.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(checkoutController.initialize);
