'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/components/auth/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { safeNextPath } from '@/lib/safe-redirect';
import { cn, formatDate, pluralize } from '@/lib/utils';
import type { OrderDTO, OrderStatus, SessionUserDTO } from '@/types';
import { ProductImage } from '@/components/product/ProductImage';

const STATUS_STYLE: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Awaiting payment', className: 'bg-amber-50 text-amber-800' },
  PAID: { label: 'Paid', className: 'bg-emerald-50 text-emerald-800' },
  PROCESSING: { label: 'Processing', className: 'bg-brand-50 text-brand-800' },
  SHIPPED: { label: 'Shipped', className: 'bg-brand-50 text-brand-800' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-700' },
  FAILED: { label: 'Payment failed', className: 'bg-rose-50 text-rose-800' },
  REFUNDED: { label: 'Refunded', className: 'bg-slate-100 text-slate-700' },
};

export function AccountView() {
  const { user, checking } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [redirecting, setRedirecting] = useState(false);

  // Signed in and sent here with ?next=/somewhere → go back there.
  useEffect(() => {
    if (!user || !next) return;
    const target = safeNextPath(next, '/account');
    if (target !== '/account') {
      setRedirecting(true);
      router.replace(target);
    }
  }, [user, next, router]);

  if ((checking && !user) || redirecting) {
    return (
      <div className="container-page grid h-80 place-items-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <SignInPanel next={next} />;
}

function SignInPanel({ next }: { next: string | null }) {
  const wantsAdmin = safeNextPath(next, '').startsWith('/admin');
  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-2 text-slate-600">
          {wantsAdmin
            ? 'Sign in with your administrator account to open the Admin Portal.'
            : 'Track orders, check out faster and keep your cart on every device.'}
        </p>
        <div className="mt-8">
          {/* After success, AccountView's effect sends the user to ?next=, or shows their orders. */}
          <AuthForm idPrefix="account" onSuccess={() => undefined} />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user }: { user: SessionUserDTO }) {
  const { signOut: endSession } = useAuth();
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    apiFetch<OrderDTO[]>('/api/orders')
      .then(setOrders)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load orders.'));
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await endSession();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Hello, {user.firstName}</h1>
          <p className="mt-1 text-slate-600">
            {user.email}
            {user.phone ? ` · ${user.phone}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === 'ADMIN' ? (
            <Link href="/admin" className="btn-primary h-10 px-4 text-sm">
              Open Admin Portal
            </Link>
          ) : null}
          <button type="button" onClick={signOut} disabled={signingOut} className="btn-secondary h-10 px-4 text-sm">
            {signingOut ? <Spinner /> : null}
            Sign out
          </button>
        </div>
      </div>

      <section className="mt-10" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="text-xl font-semibold text-slate-900">
          Your orders
        </h2>
        {error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
        ) : orders === null ? (
          <div className="mt-6 text-brand-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-medium text-slate-900">No orders yet</p>
            <p className="mt-1 text-sm text-slate-600">Orders you place while signed in will appear here.</p>
            <Link href="/shop" className="btn-primary mt-5">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {orders.map((order) => {
              const status = STATUS_STYLE[order.status];
              return (
                <li key={order.orderNumber} className="rounded-xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-900">{order.orderNumber}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(order.createdAt)} · {pluralize(order.items.reduce((n, i) => n + i.quantity, 0), 'item')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', status.className)}>{status.label}</span>
                      <span className="font-semibold tabular-nums text-slate-900">{formatMoney(order.total)}</span>
                    </div>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <li key={item.sku}>
                        <Link
                          href={`/product/${item.productSlug}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 py-1 pl-1 pr-3 text-sm text-slate-700 hover:border-slate-400"
                        >
                          <ProductImage src={item.image} alt="" className="h-8 w-8 rounded object-contain" />
                          <span className="max-w-[14rem] truncate">{item.productName}</span>
                          <span className="text-slate-400">×{item.quantity}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
