import { withParams } from '@/lib/http';
import * as admin from '@/server/controllers/admin.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = withParams(admin.categoryUpdate);
export const DELETE = withParams(admin.categoryDelete);
