import { withErrorHandling } from '@/lib/http';
import * as admin from '@/server/controllers/admin.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Long catalog syncs may take a while on large supplier feeds
export const maxDuration = 300;

export const POST = withErrorHandling(admin.syncSupplier);
