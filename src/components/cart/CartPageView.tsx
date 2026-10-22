'use client';

import Link from 'next/link';
import { CartIcon, LockIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/currency';
import { freeShippingThreshold } from '@/lib/shipping';
import { pluralize } from '@/lib/utils';
import { CartLineItem } from './CartLineItem';
import { useCart } from './CartProvider';

export function CartPageView() {
  const { cart, loading, error, clearError } = useCart();
  const hasUnavailable = cart.items.some((item) => !item.available);
  const remaining = Math.max(0, freeShippingThreshold() - cart.subtotal);

  if (loading) {
    return (
      <div className="container-page grid h-80 place-items-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
          <CartIcon size={28} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 max-w-md text-slate-600">Find laptops, phones, power solutions and repair services in the catalog.</p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse the catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Your cart</h1>
      <p className="mt-1 text-slate-500">{pluralize(cart.itemCount, 'item')}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Cart items">
          <ul className="divide-y divide-slate-200 border-y border-slate-200">
            {cart.items.map((item) => (
              <CartLineItem key={item.id} item={item} large />
            ))}
          </ul>
          <Link href="/shop" className="mt-6 inline-block text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
            Continue shopping
          </Link>
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-medium text-slate-900 tabular-nums">{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Delivery</dt>
              <dd className="text-slate-900">
                {!cart.hasPhysicalItems ? 'Not required' : remaining === 0 ? 'Free' : 'Calculated at checkout'}
              </dd>
            </div>
          </dl>
          {cart.hasPhysicalItems && remaining > 0 ? (
            <p className="mt-4 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-600">
              Add <strong className="tabular-nums text-slate-900">{formatMoney(remaining)}</strong> more for free delivery.
            </p>
          ) : null}
          <div className="mt-5 flex items-baseline justify-between border-t border-slate-200 pt-5">
            <span className="font-semibold text-slate-900">Estimated total</span>
            <span className="text-2xl font-semibold text-slate-900 tabular-nums" aria-live="polite">
              {formatMoney(cart.subtotal)}
            </span>
          </div>
          {error ? (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}{' '}
              <button type="button" onClick={clearError} className="font-semibold underline">
                Dismiss
              </button>
            </p>
          ) : null}
          {hasUnavailable ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Remove unavailable items to continue.</p>
          ) : null}
          <Link
            href="/checkout"
            aria-disabled={hasUnavailable}
            className={hasUnavailable ? 'btn-primary pointer-events-none mt-6 w-full !bg-slate-300 !shadow-none' : 'btn-primary mt-6 w-full'}
          >
            <LockIcon size={18} />
            Checkout securely
          </Link>
          <p className="mt-3 text-center text-xs text-slate-500">Pay by card, bank transfer or USSD via Paystack.</p>
        </aside>
      </div>
    </div>
  );
}
