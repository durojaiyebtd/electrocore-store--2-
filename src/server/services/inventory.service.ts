/**
 * Stock movements. Every change writes an InventoryLog row so stock levels can
 * always be explained ("why do we have 3 left?").
 */
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';

export interface StockDeductionLine {
  productId: string;
  variantId: string;
  quantity: number;
  label: string;
}

export interface StockDeductionResult {
  oversold: Array<{ label: string; requested: number; deducted: number }>;
}

/**
 * Deduct stock for a paid order.
 * Uses a conditional update (stock >= quantity) so two simultaneous payments can
 * never push stock below zero. If stock ran out between checkout and payment,
 * whatever is left is deducted and the shortfall is reported for manual review.
 */
export async function deductStockForOrder(orderNumber: string, lines: StockDeductionLine[]): Promise<StockDeductionResult> {
  const result: StockDeductionResult = { oversold: [] };

  for (const line of lines) {
    const updated = await prisma.productVariant.updateMany({
      where: { id: line.variantId, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });

    let deducted = line.quantity;
    if (updated.count === 0) {
      // Not enough stock left: take what remains and flag the order.
      const current = await prisma.productVariant.findUnique({ where: { id: line.variantId }, select: { stock: true } });
      const remaining = Math.max(0, current?.stock ?? 0);
      deducted = remaining;
      if (remaining > 0) {
        await prisma.productVariant.updateMany({
          where: { id: line.variantId, stock: remaining },
          data: { stock: 0 },
        });
      }
      result.oversold.push({ label: line.label, requested: line.quantity, deducted });
    }

    if (deducted > 0) {
      await prisma.product.update({
        where: { id: line.productId },
        data: { totalStock: { decrement: deducted } },
      });
    }

    const after = await prisma.productVariant.findUnique({ where: { id: line.variantId }, select: { stock: true } });
    await prisma.inventoryLog.create({
      data: {
        productId: line.productId,
        variantId: line.variantId,
        change: -deducted,
        balanceAfter: after?.stock ?? 0,
        reason: deducted < line.quantity ? 'OVERSOLD' : 'SALE',
        reference: orderNumber,
        note:
          deducted < line.quantity
            ? `Oversold: ${line.quantity} requested, only ${deducted} in stock`
            : `Sold ${line.quantity} via order ${orderNumber}`,
      },
    });
  }

  // Keep the denormalised product total from drifting below zero
  await prisma.product.updateMany({ where: { totalStock: { lt: 0 } }, data: { totalStock: 0 } });
  return result;
}

export interface StockAdjustmentInput {
  variantId: string;
  mode: 'add' | 'remove' | 'set';
  quantity: number;
  reason: 'RESTOCK' | 'ADJUSTMENT' | 'RETURN';
  note?: string;
  actor: string;
}

/**
 * Manual stock change from the admin portal. Uses atomic increments so a sale
 * happening at the same moment is never lost, and logs who changed what.
 */
export async function adjustStock(input: StockAdjustmentInput): Promise<{ stock: number; change: number }> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    select: { id: true, productId: true, stock: true },
  });
  if (!variant) {
    throw new ApiError(404, 'Variant not found.', 'VARIANT_NOT_FOUND');
  }

  let change: number;
  if (input.mode === 'add') {
    change = input.quantity;
  } else if (input.mode === 'remove') {
    if (input.quantity > variant.stock) {
      throw new ApiError(409, `Only ${variant.stock} in stock — you cannot remove ${input.quantity}.`, 'INSUFFICIENT_STOCK');
    }
    change = -input.quantity;
  } else {
    change = input.quantity - variant.stock;
  }

  if (change === 0) {
    return { stock: variant.stock, change: 0 };
  }

  if (change < 0) {
    const updated = await prisma.productVariant.updateMany({
      where: { id: variant.id, stock: { gte: -change } },
      data: { stock: { increment: change } },
    });
    if (updated.count === 0) {
      throw new ApiError(409, 'Stock changed while you were editing. Refresh and try again.', 'STOCK_CHANGED');
    }
  } else {
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: change } } });
  }
  await prisma.product.update({ where: { id: variant.productId }, data: { totalStock: { increment: change } } });

  const after = await prisma.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } });
  await prisma.inventoryLog.create({
    data: {
      productId: variant.productId,
      variantId: variant.id,
      change,
      balanceAfter: after?.stock ?? 0,
      reason: input.reason,
      note: input.note || (input.mode === 'set' ? `Stock count set to ${input.quantity}` : null),
      actor: input.actor,
    },
  });
  await recalculateProductStock(variant.productId);
  return { stock: after?.stock ?? 0, change };
}

/** Recompute the denormalised product total from its active variants. */
export async function recalculateProductStock(productId: string): Promise<void> {
  const variants = await prisma.productVariant.findMany({ where: { productId, isActive: true }, select: { stock: true } });
  const totalStock = variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  await prisma.product.update({ where: { id: productId }, data: { totalStock } });
}

/**
 * Put an order's items back into stock (cancellation or refund).
 * Guarded by `restockedAt` so it can only ever happen once per order.
 */
export async function restockOrder(orderId: string, actor: string): Promise<boolean> {
  // MongoDB: an optional field that was never written is "unset", not null, so match both.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, OR: [{ restockedAt: null }, { restockedAt: { isSet: false } }] },
    data: { restockedAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return false;

  for (const item of order.items) {
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId }, select: { id: true } });
    if (!variant) continue; // variant deleted since the sale
    await prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    const after = await prisma.productVariant.findUnique({ where: { id: item.variantId }, select: { stock: true } });
    await prisma.inventoryLog.create({
      data: {
        productId: item.productId,
        variantId: item.variantId,
        change: item.quantity,
        balanceAfter: after?.stock ?? item.quantity,
        reason: 'RETURN',
        reference: order.orderNumber,
        note: `Returned to stock from order ${order.orderNumber}`,
        actor,
      },
    });
    await recalculateProductStock(item.productId);
  }
  return true;
}
