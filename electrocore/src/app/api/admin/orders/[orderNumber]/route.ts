import { withParams } from '@/lib/http';
import * as admin from '@/server/controllers/admin.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withParams(admin.orderDetail);
export const PATCH = withParams(admin.orderUpdateStatus);
