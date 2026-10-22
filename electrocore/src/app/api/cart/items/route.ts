import { withErrorHandling } from '@/lib/http';
import * as cartController from '@/server/controllers/cart.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(cartController.addItem);
