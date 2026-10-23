/**
 * Admin portal API controllers. Every handler calls requireAdmin() first, which
 * re-checks the signed-in user's role in the database.
 */
import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, ok, parseBody, parseQuery, type RouteContext } from '@/lib/http';
import { requireAdmin } from '@/lib/admin-auth';
import {
  categoryInputSchema,
  customerRoleSchema,
  inventoryLogQuerySchema,
  listQuerySchema,
  orderListQuerySchema,
  productInputSchema,
  productListQuerySchema,
  refundOrderSchema,
  reportExportQuerySchema,
  reportQuerySchema,
  trackingSchema,
  resolveReviewSchema,
  stockAdjustmentSchema,
  transactionListQuerySchema,
  updateOrderStatusSchema,
} from '@/lib/admin-validators';
import { getSupplier } from '@/lib/suppliers';
import { z } from 'zod';
import { syncFromSupplier } from '../services/sync.service';
import { adjustStock } from '../services/inventory.service';
import { getDashboard, getLowStock } from '../services/admin/dashboard.service';
import { getOrderDetail, listOrders, refundOrder, resolveReview, setTracking, updateOrderStatus } from '../services/admin/admin-order.service';
import { listTransactions } from '../services/admin/admin-transaction.service';
import { createProduct, deleteProduct, getProduct, listProducts, setProductActive, updateProduct } from '../services/admin/admin-product.service';
import { siteContentSchema } from '@/lib/site-content';
import { getSiteContent, saveSiteContent } from '../services/content.service';
import { listNotifications } from '../services/admin/notification.service';
import { saveImage } from '../services/admin/image.service';
import { buildReport, exportCsv, resolveRange } from '../services/admin/report.service';
import {
  createCategory,
  deleteCategory,
  getSystemStatus,
  listAdminCategories,
  listCustomers,
  listInventoryLogs,
  setCustomerRole,
  updateCategory,
} from '../services/admin/admin-misc.service';

// ----------------------------------------------------------------- Dashboard

/** GET /api/admin/dashboard */
export async function dashboard() {
  await requireAdmin();
  return ok(await getDashboard());
}

// ----------------------------------------------------------------- Orders

/** GET /api/admin/orders?status=&review=1&q=&page= */
export async function orders(req: NextRequest) {
  await requireAdmin();
  return ok(await listOrders(parseQuery(req, orderListQuerySchema)));
}

/** GET /api/admin/orders/:orderNumber */
export async function orderDetail(_req: NextRequest, ctx: RouteContext<{ orderNumber: string }>) {
  await requireAdmin();
  const { orderNumber } = await ctx.params;
  return ok(await getOrderDetail(orderNumber));
}

/** PATCH /api/admin/orders/:orderNumber  { status, note?, restock? } */
export async function orderUpdateStatus(req: NextRequest, ctx: RouteContext<{ orderNumber: string }>) {
  const admin = await requireAdmin();
  const { orderNumber } = await ctx.params;
  const input = await parseBody(req, updateOrderStatusSchema);
  return ok(await updateOrderStatus(orderNumber, input, admin));
}

/** POST /api/admin/orders/:orderNumber/tracking  { courier, trackingNumber } */
export async function orderTracking(req: NextRequest, ctx: RouteContext<{ orderNumber: string }>) {
  const admin = await requireAdmin();
  const { orderNumber } = await ctx.params;
  const input = await parseBody(req, trackingSchema);
  return ok(await setTracking(orderNumber, input, admin));
}

/** POST /api/admin/orders/:orderNumber/refund  { method, note?, restock } */
export async function orderRefund(req: NextRequest, ctx: RouteContext<{ orderNumber: string }>) {
  const admin = await requireAdmin();
  const { orderNumber } = await ctx.params;
  const input = await parseBody(req, refundOrderSchema);
  return ok(await refundOrder(orderNumber, input, admin));
}

/** POST /api/admin/orders/:orderNumber/review  { note } */
export async function orderResolveReview(req: NextRequest, ctx: RouteContext<{ orderNumber: string }>) {
  const admin = await requireAdmin();
  const { orderNumber } = await ctx.params;
  const { note } = await parseBody(req, resolveReviewSchema);
  return ok(await resolveReview(orderNumber, note, admin));
}

// ------------------------------------------------------------- Transactions

/** GET /api/admin/transactions?status=&q=&page= */
export async function transactions(req: NextRequest) {
  await requireAdmin();
  return ok(await listTransactions(parseQuery(req, transactionListQuerySchema)));
}

// ----------------------------------------------------------------- Products

/** GET /api/admin/products?q=&category=&status=&page= */
export async function products(req: NextRequest) {
  await requireAdmin();
  return ok(await listProducts(parseQuery(req, productListQuerySchema)));
}

/** POST /api/admin/products */
export async function productCreate(req: NextRequest) {
  const admin = await requireAdmin();
  const input = await parseBody(req, productInputSchema);
  return ok(await createProduct(input, admin), { status: 201 });
}

/** GET /api/admin/products/:id */
export async function productDetail(_req: NextRequest, ctx: RouteContext<{ id: string }>) {
  await requireAdmin();
  const { id } = await ctx.params;
  return ok(await getProduct(id));
}

/** PUT /api/admin/products/:id */
export async function productUpdate(req: NextRequest, ctx: RouteContext<{ id: string }>) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const input = await parseBody(req, productInputSchema);
  return ok(await updateProduct(id, input, admin));
}

/** DELETE /api/admin/products/:id */
export async function productDelete(_req: NextRequest, ctx: RouteContext<{ id: string }>) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  return ok(await deleteProduct(id, admin));
}

/** PATCH /api/admin/products/:id  { isActive } — publish / unpublish */
export async function productSetActive(req: NextRequest, ctx: RouteContext<{ id: string }>) {
  await requireAdmin();
  const { id } = await ctx.params;
  const { isActive } = await parseBody(req, z.object({ isActive: z.boolean() }));
  return ok(await setProductActive(id, isActive));
}

// ----------------------------------------------------------------- Inventory

/** GET /api/admin/inventory?productId=&variantId=&reason=&page= */
export async function inventoryLogs(req: NextRequest) {
  await requireAdmin();
  return ok(await listInventoryLogs(parseQuery(req, inventoryLogQuerySchema)));
}

/** GET /api/admin/inventory/low-stock */
export async function lowStock() {
  await requireAdmin();
  return ok(await getLowStock(50));
}

/** POST /api/admin/inventory/adjust  { variantId, mode, quantity, reason, note? } */
export async function inventoryAdjust(req: NextRequest) {
  const admin = await requireAdmin();
  const input = await parseBody(req, stockAdjustmentSchema);
  return ok(await adjustStock({ ...input, actor: admin.email }));
}

// ----------------------------------------------------------------- Customers

/** GET /api/admin/customers?q=&page= */
export async function customers(req: NextRequest) {
  await requireAdmin();
  return ok(await listCustomers(parseQuery(req, listQuerySchema)));
}

/** PATCH /api/admin/customers/:id  { role } */
export async function customerSetRole(req: NextRequest, ctx: RouteContext<{ id: string }>) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { role } = await parseBody(req, customerRoleSchema);
  await setCustomerRole(id, role, admin);
  return ok({ updated: true });
}

// ----------------------------------------------------------------- Categories

/** GET /api/admin/categories */
export async function categories() {
  await requireAdmin();
  return ok(await listAdminCategories());
}

/** POST /api/admin/categories */
export async function categoryCreate(req: NextRequest) {
  await requireAdmin();
  await createCategory(await parseBody(req, categoryInputSchema));
  return ok(await listAdminCategories(), { status: 201 });
}

/** PUT /api/admin/categories/:id */
export async function categoryUpdate(req: NextRequest, ctx: RouteContext<{ id: string }>) {
  await requireAdmin();
  const { id } = await ctx.params;
  await updateCategory(id, await parseBody(req, categoryInputSchema));
  return ok(await listAdminCategories());
}

/** DELETE /api/admin/categories/:id */
export async function categoryDelete(_req: NextRequest, ctx: RouteContext<{ id: string }>) {
  await requireAdmin();
  const { id } = await ctx.params;
  await deleteCategory(id);
  return ok(await listAdminCategories());
}

// ----------------------------------------------------------------- Settings & supplier sync

/** GET /api/admin/system */
export async function systemStatus() {
  await requireAdmin();
  return ok(await getSystemStatus());
}

function hasValidSyncToken(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_TOKEN ?? '';
  const header = req.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  return (
    expected.length >= 24 &&
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  );
}

/**
 * POST /api/admin/sync?supplier=mock|http
 * Signed-in admins can run it from Settings; a cron job can call it with
 * the header  Authorization: Bearer <ADMIN_API_TOKEN>.
 */
export async function syncSupplier(req: NextRequest) {
  if (req.headers.get('authorization')) {
    if (!hasValidSyncToken(req)) throw new ApiError(401, 'Invalid admin token.', 'UNAUTHORIZED');
  } else {
    await requireAdmin();
  }
  const supplierKey = req.nextUrl.searchParams.get('supplier') ?? undefined;
  let adapter;
  try {
    adapter = getSupplier(supplierKey);
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Unknown supplier', 'UNKNOWN_SUPPLIER');
  }
  return ok(await syncFromSupplier(adapter));
}

// ------------------------------------------------------------------- Reports

/** GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function report(req: NextRequest) {
  await requireAdmin();
  const { from, to } = parseQuery(req, reportQuerySchema);
  return ok(await buildReport(resolveRange(from, to)));
}

/** GET /api/admin/reports/export?type=orders|transactions|customers|inventory&from=&to= — downloads a CSV file */
export async function reportExport(req: NextRequest) {
  await requireAdmin();
  const { type, from, to } = parseQuery(req, reportExportQuerySchema);
  const { filename, body } = await exportCsv(type, resolveRange(from, to));
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// ------------------------------------------------------------------- Uploads

/** POST /api/admin/uploads  (multipart form, field "file") — returns { url } for use as a product image */
export async function uploadImage(req: NextRequest) {
  const admin = await requireAdmin();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, 'Send the photo as a form upload.', 'BAD_UPLOAD');
  }
  const file = form.get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'Choose a photo to upload.', 'NO_FILE');
  return ok(await saveImage(file, admin), { status: 201 });
}

// ------------------------------------------------------------ Website content

/** GET /api/admin/content */
export async function contentGet() {
  await requireAdmin();
  return ok(await getSiteContent());
}

/** PUT /api/admin/content — saves homepage text, the announcement bar and the banner picture */
export async function contentSave(req: NextRequest) {
  await requireAdmin();
  const input = await parseBody(req, siteContentSchema);
  return ok(await saveSiteContent(input));
}

// ------------------------------------------------------------- Notifications

/** GET /api/admin/notifications */
export async function notifications() {
  await requireAdmin();
  return ok(await listNotifications());
}
