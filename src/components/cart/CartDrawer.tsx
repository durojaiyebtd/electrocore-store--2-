'use client';

/**
 * Slide-over cart. Subtotal and free-delivery progress update instantly as
 * quantities change (optimistic), then reconcile with the server.
 */
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { CartIcon, CloseIcon, LockIcon, TruckIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/currency';
import { freeShippingThreshold } from '@/lib/shipping';
import { pluralize } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { CartLineItem } from './CartLineItem';
import { useCart } from './CartProvider';

export function CartDrawer() {
  const { cart, loading, isDrawerOpen, closeDrawer, error, clearError } = useCart();
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const threshold = freeShippingThreshold();
  const remaining = Math.max(0, threshold - cart.subtotal);
  const progress = threshold > 0 ? Math.min(100, Math.round((cart.subtotal / threshold) * 100)) : 100;
  const hasUnavailable = cart.items.some((item) => !item.available);

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-[2px]" onClick={closeDrawer} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col bg-white shadow-2xl focus:outline-none motion-reduce:animate-none"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Your cart <span className="font-normal text-slate-500">({pluralize(cart.itemCount, 'item')})</span>
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
            aria-label="Close cart"
          >
            <CloseIcon />
          </button>
        </header>

        {cart.hasPhysicalItems ? (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <TruckIcon size={18} className="text-brand-600" />
              {remaining > 0 ? (
                <>
                  Add <strong className="tabular-nums">{formatMoney(remaining)}</strong> more for free delivery
                </>
              ) : (
                <strong className="text-emerald-700">Your order qualifies for free delivery</strong>
              )}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="grid h-40 place-items-center text-brand-600">
              <Spinner className="h-6 w-6" />
            </div>
          ) : cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
                <CartIcon size={28} />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Your cart is empty</p>
                <p className="mt-1 text-sm text-slate-500">Browse laptops, phones, power solutions and repair services.</p>
              </div>
              <Link
                href="/shop"
                onClick={closeDrawer}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Browse the catalog
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {cart.items.map((item) => (
                <CartLineItem key={item.id} item={item} onNavigate={closeDrawer} />
              ))}
            </ul>
          )}
        </div>

        {cart.items.length > 0 ? (
          <footer className="border-t border-slate-200 px-5 py-5">
            {error ? (
              <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}{' '}
                <button type="button" className="font-semibold underline" onClick={clearError}>
                  Dismiss
                </button>
              </p>
            ) : null}
            {hasUnavailable ? (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Some items are no longer available and are not included in your subtotal. Remove them to continue.
              </p>
            ) : null}
            <dl className="flex items-baseline justify-between">
              <dt className="text-base text-slate-700">Subtotal</dt>
              <dd className="text-xl font-semibold text-slate-900 tabular-nums" aria-live="polite">
                {formatMoney(cart.subtotal)}
              </dd>
            </dl>
            <p className="mt-1 text-sm text-slate-500">
              Delivery is calculated at checkout.
              {!user ? ' You will sign in or create an account before paying; your cart is kept.' : null}
            </p>
            <div className="mt-4 grid gap-2">
              <Link
                href="/checkout"
                onClick={closeDrawer}
                aria-disabled={hasUnavailable}
                className={
                  hasUnavailable
                    ? 'pointer-events-none flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-300 text-base font-semibold text-white'
                    : 'flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 text-base font-semibold text-white shadow-lift hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
                }
              >
                <LockIcon size={18} />
                Proceed to Checkout
              </Link>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="flex h-11 items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                View full cart
              </Link>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
