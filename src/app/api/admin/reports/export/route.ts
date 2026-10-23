import { withErrorHandling } from '@/lib/http';
import * as admin from '@/server/controllers/admin.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = withErrorHandling(admin.reportExport);
