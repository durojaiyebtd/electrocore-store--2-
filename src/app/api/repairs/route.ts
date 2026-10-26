import { withErrorHandling } from '@/lib/http';
import * as repairCtl from '@/server/controllers/repair.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(repairCtl.create);
