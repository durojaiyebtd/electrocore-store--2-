/**
 * Admin portal API controllers. Every handler calls requireAdmin() first, which
 * re-checks the signed-in user's role in the database.
 */
import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
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
  resolveReviewSchema,
  stockAdjustmentSchema,
  updateOrderStatusSchema,
} from '@/lib/admin-validators';
import { getSupplier } from '@/lib/suppliers';
import { z } from 'zod';
import { syncFromSupplier } from '../services/sync.service';
import { adjustStock } from '../services/inventory.service';
import { getDashboard, getLowStock } from '../services/admin/dashboard.service';
import { getOrderDetail, listOrders, refundOrder, resolveReview, updateOrderStatus } from '../services/admin/admin-order.service';
import { createProduct, getProduct, listProducts, setProductActive, updateProduct } from '../services/admin/admin-product.service';
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
