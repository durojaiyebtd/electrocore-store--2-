import { withParams } from '@/lib/http';
import * as admin from '@/server/controllers/admin.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withParams(admin.productDetail);
export const PUT = withParams(admin.productUpdate);
export const PATCH = withParams(admin.productSetActive);
export const DELETE = withParams(admin.productDelete);
