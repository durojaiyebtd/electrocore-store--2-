import { withParams } from '@/lib/http';
import * as adminRepairCtl from '@/server/controllers/admin-repair.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withParams(adminRepairCtl.recordPayment);
