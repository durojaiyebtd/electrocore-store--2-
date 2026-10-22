'use client';

import Link from 'next/link';
import { MinusIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons';
import { formatMoney } from '@/lib/currency';
import { ProductImage } from '@/components/product/ProductImage';
import { cn } from '@/lib/utils';
import type { CartItemDTO } from '@/types';
import { useCart } from './CartProvider';

export function CartLineItem({ item, onNavigate, large = false }: { item: CartItemDTO; onNavigate?: () => void; large?: boolean }) {
  const { updateQuantity, removeItem, pendingItemIds } = useCart();
  const pending = pendingItemIds.includes(item.id);
  const maxQuantity = Math.min(item.stock, 99);

  return (
    <li className={cn('flex gap-4 py-4', pending && 'opacity-70')}>
      <Link
        href={`/product/${item.productSlug}`}
        onClick={onNavigate}
        className={cn('shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50', large ? 'h-28 w-28' : 'h-20 w-20')}
      >
        <ProductImage src={item.image} alt={item.productName} fallbackLabel={item.productName} className="h-full w-full object-contain" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/product/${item.productSlug}`}
              onClick={onNavigate}
              className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 hover:text-brand-700"
            >
              {item.productName}
            </Link>
            {item.variantName !== 'Standard' ? <p className="mt-0.5 text-sm text-slate-500">{item.variantName}</p> : null}
            {large ? <p className="mt-0.5 font-mono text-xs text-slate-400">SKU {item.sku}</p> : null}
          </div>
          <p className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{formatMoney(item.lineTotal)}</p>
        </div>

        {!item.available ? (
          <p className="mt-2 text-sm font-medium text-rose-700">No longer available</p>
        ) : item.quantity > item.stock ? (
          <p className="mt-2 text-sm font-medium text-amber-700">Only {item.stock} left — reduce quantity</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-2">
          {item.available ? (
            <div className="flex h-9 items-center rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                className="grid h-full w-9 place-items-center text-slate-600 hover:text-slate-900"
                aria-label={`Decrease quantity of ${item.productName}`}
              >
                <MinusIcon size={16} />
              </button>
              <span className="w-9 text-center text-sm font-medium tabular-nums" aria-live="polite">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= maxQuantity}
                className="grid h-full w-9 place-items-center text-slate-600 hover:text-slate-900 disabled:opacity-40"
                aria-label={`Increase quantity of ${item.productName}`}
              >
                <PlusIcon size={16} />
              </button>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => void removeItem(item.id)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-700"
          >
            <TrashIcon size={16} />
            Remove
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400 tabular-nums">{formatMoney(item.unitPrice)} each</p>
      </div>
    </li>
  );
}
