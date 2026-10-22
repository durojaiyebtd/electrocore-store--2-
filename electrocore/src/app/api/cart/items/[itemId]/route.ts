import { withParams } from '@/lib/http';
import * as cartController from '@/server/controllers/cart.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withParams(cartController.updateItem);
export const DELETE = withParams(cartController.removeItem);
