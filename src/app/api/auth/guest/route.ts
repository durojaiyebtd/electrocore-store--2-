import { withErrorHandling } from '@/lib/http';
import * as authController from '@/server/controllers/auth.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(authController.guest);
