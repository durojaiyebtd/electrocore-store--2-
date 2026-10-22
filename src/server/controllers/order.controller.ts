import type { NextRequest } from 'next/server';
import { ApiError, ok, type RouteContext } from '@/lib/http';
import { getSession } from '@/lib/auth';
import { getOrderForUser, listOrdersForUser } from '../services/order.service';

async function requireSession() {
  const session = await getSession();
  if (!session) throw new ApiError(401, 'Please sign in to view your orders.', 'UNAUTHENTICATED');
  return session;
}

/** GET /api/orders — the signed-in customer's order history */
export async function list() {
  const session = await requireSession();
  return ok(await listOrdersForUser(session.userId));
}

/** GET /api/orders/:orderNumber */
export async function detail(_req: NextRequest, ctx: RouteContext<{ orderNumber: string }>) {
  const session = await requireSession();
  const { orderNumber } = await ctx.params;
  return ok(await getOrderForUser(orderNumber, session.userId));
}
