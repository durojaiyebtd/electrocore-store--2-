import { withParams } from '@/lib/http';
import * as adminRepairCtl from '@/server/controllers/admin-repair.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = withParams(adminRepairCtl.updateRepairer);
export const DELETE = withParams(adminRepairCtl.deleteRepairer);
