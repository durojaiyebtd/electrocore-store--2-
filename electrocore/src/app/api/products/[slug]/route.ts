import { withParams } from '@/lib/http';
import * as productController from '@/server/controllers/product.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withParams(productController.detail);
