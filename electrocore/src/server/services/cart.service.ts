/**
 * Server-side cart.
 * - Guests: cart identified by an httpOnly cookie token.
 * - Signed-in users: cart linked to userId; a guest cart is merged in on login.
 * Prices are always read live from the variant, so the cart can never be
 * tampered with from the browser.
 */
import { cookies } from 'next/headers';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { generateToken } from '@/lib/ids';
import { getSession } from '@/lib/auth';
import type { CartDTO, CartItemDTO, Fulfillment } from '@/types';
import { PLACEHOLDER_IMAGE } from './catalog.service';

export const CART_COOKIE = 'mes_cart';
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          product: {
            select: { id: true, slug: true, name: true, images: true, fulfillment: true, isActive: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

async function setCartCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export async function clearCartCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

/** Move every item from one cart into another (quantities add up, capped at stock). */
async function mergeCarts(fromCartId: string, intoCartId: string): Promise<void> {
  const fromItems = await prisma.cartItem.findMany({ where: { cartId: fromCartId }, include: { variant: true } });
  for (const item of fromItems) {
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: intoCartId, variantId: item.variantId } },
    });
    const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, Math.max(item.variant.stock, 1), 99);
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: intoCartId, variantId: item.variantId } },
      create: { cartId: intoCartId, variantId: item.variantId, quantity },
      update: { quantity },
    });
  }
  await prisma.cart.delete({ where: { id: fromCartId } });
}

/**
 * Find the current visitor's cart (optionally creating one).
 * Handles linking a guest cart to a user after login.
 */
export async function resolveCart(options: { create: boolean; userId?: string }): Promise<CartWithItems | null> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value ?? null;
  // `userId` lets login/register link carts in the same request the session cookie is set
  const session = options.userId ? { userId: options.userId } : await getSession();

  const tokenCart = token ? await prisma.cart.findUnique({ where: { token } }) : null;

  if (session) {
    const userCart = await prisma.cart.findFirst({ where: { userId: session.userId }, orderBy: { updatedAt: 'desc' } });

    if (tokenCart && userCart && tokenCart.id !== userCart.id) {
      if (tokenCart.userId === null) {
        await mergeCarts(tokenCart.id, userCart.id);
      }
      await setCartCookie(userCart.token);
      return prisma.cart.findUnique({ where: { id: userCart.id }, include: cartInclude });
    }
    if (tokenCart && !userCart) {
      if (tokenCart.userId === null || tokenCart.userId === session.userId) {
        await prisma.cart.update({ where: { id: tokenCart.id }, data: { userId: session.userId } });
        return prisma.cart.findUnique({ where: { id: tokenCart.id }, include: cartInclude });
      }
    }
    if (userCart) {
      if (token !== userCart.token) await setCartCookie(userCart.token);
      return prisma.cart.findUnique({ where: { id: userCart.id }, include: cartInclude });
    }
    if (!options.create) return null;
    const created = await prisma.cart.create({ data: { token: generateToken(), userId: session.userId }, include: cartInclude });
    await setCartCookie(created.token);
    return created;
  }

  if (tokenCart && tokenCart.userId === null) {
    return prisma.cart.findUnique({ where: { id: tokenCart.id }, include: cartInclude });
  }
  if (!options.create) return null;
  const created = await prisma.cart.create({ data: { token: generateToken() }, include: cartInclude });
  await setCartCookie(created.token);
  return created;
}

export function toCartDTO(cart: CartWithItems | null): CartDTO {
  if (!cart) {
    return { id: null, items: [], itemCount: 0, subtotal: 0, hasPhysicalItems: false };
  }
  const items: CartItemDTO[] = cart.items.map((item) => {
    const { variant } = item;
    const product = variant.product;
    const available = product.isActive && variant.isActive && variant.stock > 0;
    return {
      id: item.id,
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      image: variant.image ?? product.images[0] ?? PLACEHOLDER_IMAGE,
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      quantity: item.quantity,
      lineTotal: variant.price * item.quantity,
      stock: variant.stock,
      fulfillment: product.fulfillment as Fulfillment,
      available,
    };
  });
  const purchasable = items.filter((i) => i.available);
  return {
    id: cart.id,
    items,
    itemCount: purchasable.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: purchasable.reduce((sum, i) => sum + i.lineTotal, 0),
    hasPhysicalItems: purchasable.some((i) => i.fulfillment === 'PHYSICAL'),
  };
}

export async function getCart(): Promise<CartDTO> {
  return toCartDTO(await resolveCart({ create: false }));
}

async function loadVariantOrThrow(variantId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { isActive: true, name: true } } },
  });
  if (!variant || !variant.isActive || !variant.product.isActive) {
    throw new ApiError(404, 'This product is no longer available.', 'VARIANT_NOT_FOUND');
  }
  return variant;
}

export async function addItem(variantId: string, quantity: number): Promise<CartDTO> {
  const variant = await loadVariantOrThrow(variantId);
  if (variant.stock <= 0) {
    throw new ApiError(409, `${variant.product.name} (${variant.name}) is out of stock.`, 'OUT_OF_STOCK');
  }
  const cart = await resolveCart({ create: true });
  if (!cart) throw new ApiError(500, 'Could not create a cart.', 'CART_ERROR');

  const existing = cart.items.find((item) => item.variantId === variantId);
  const desired = (existing?.quantity ?? 0) + quantity;
  if (desired > variant.stock) {
    throw new ApiError(
      409,
      `Only ${variant.stock} unit${variant.stock === 1 ? '' : 's'} of ${variant.product.name} (${variant.name}) available.`,
      'INSUFFICIENT_STOCK',
      { available: variant.stock },
    );
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: desired },
    update: { quantity: desired },
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return toCartDTO(await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude }));
}

async function findOwnedItem(itemId: string) {
  const cart = await resolveCart({ create: false });
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) {
    throw new ApiError(404, 'That item is no longer in your cart.', 'CART_ITEM_NOT_FOUND');
  }
  return { cart, item };
}

export async function updateItemQuantity(itemId: string, quantity: number): Promise<CartDTO> {
  const { cart, item } = await findOwnedItem(itemId);
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    if (quantity > item.variant.stock) {
      throw new ApiError(
        409,
        `Only ${item.variant.stock} unit${item.variant.stock === 1 ? '' : 's'} available.`,
        'INSUFFICIENT_STOCK',
        { available: item.variant.stock },
      );
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }
  return toCartDTO(await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude }));
}

export async function removeItem(itemId: string): Promise<CartDTO> {
  const { cart, item } = await findOwnedItem(itemId);
  await prisma.cartItem.delete({ where: { id: item.id } });
  return toCartDTO(await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude }));
}

export async function clearCart(): Promise<CartDTO> {
  const cart = await resolveCart({ create: false });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  return toCartDTO(cart ? { ...cart, items: [] } : null);
}

export async function clearCartById(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}
