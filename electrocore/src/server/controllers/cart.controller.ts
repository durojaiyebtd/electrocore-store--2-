import type { NextRequest } from 'next/server';
import { ok, parseBody, type RouteContext } from '@/lib/http';
import { addToCartSchema, updateCartItemSchema } from '@/lib/validators';
import * as cartService from '../services/cart.service';

/** GET /api/cart */
export async function show() {
  return ok(await cartService.getCart());
}

/** DELETE /api/cart — empties the cart */
export async function clear() {
  return ok(await cartService.clearCart());
}

/** POST /api/cart/items  { variantId, quantity } */
export async function addItem(req: NextRequest) {
  const { variantId, quantity } = await parseBody(req, addToCartSchema);
  return ok(await cartService.addItem(variantId, quantity), { status: 201 });
}

/** PATCH /api/cart/items/:itemId  { quantity }  (0 removes the item) */
export async function updateItem(req: NextRequest, ctx: RouteContext<{ itemId: string }>) {
  const { itemId } = await ctx.params;
  const { quantity } = await parseBody(req, updateCartItemSchema);
  return ok(await cartService.updateItemQuantity(itemId, quantity));
}

/** DELETE /api/cart/items/:itemId */
export async function removeItem(_req: NextRequest, ctx: RouteContext<{ itemId: string }>) {
  const { itemId } = await ctx.params;
  return ok(await cartService.removeItem(itemId));
}
