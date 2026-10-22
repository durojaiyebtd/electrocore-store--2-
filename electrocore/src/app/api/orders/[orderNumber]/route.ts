import { withParams } from '@/lib/http';
import * as orderController from '@/server/controllers/order.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withParams(orderController.detail);
