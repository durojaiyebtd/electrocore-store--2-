'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { AlertIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
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
  const [user, setUser] = useState<SessionUserDTO | null | undefined>(undefined);

  const loadUser = useCallback(async () => {
    try {
      const { user: current } = await apiFetch<{ user: SessionUserDTO | null }>('/api/auth/me');
      setUser(current);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  if (user === undefined) {
    return (
      <div className="container-page grid h-80 place-items-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return user ? <Dashboard user={user} onSignedOut={() => setUser(null)} /> : <AuthForms onSignedIn={setUser} />;
}

function AuthForms({ onSignedIn }: { onSignedIn: (user: SessionUserDTO) => void }) {
  const { refresh } = useCart();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, phone: form.phone };
      const { user } = await apiFetch<{ user: SessionUserDTO }>(`/api/auth/${mode}`, { method: 'POST', body });
      await refresh(); // guest cart is merged into the account
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: event.target.value }));

  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
        <p className="mt-2 text-slate-600">
          {mode === 'login' ? 'Track orders, reorder faster and keep your cart across devices.' : 'It takes less than a minute. You can still check out as a guest.'}
        </p>

        <div className="mt-8 grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Account options">
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => {
                setMode(tab);
                setError(null);
              }}
              className={cn('h-10 rounded-md text-sm font-semibold transition', mode === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
            >
              {tab === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="acc-first" className="field-label">First name</label>
                <input id="acc-first" required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} className="field-input" />
              </div>
              <div>
                <label htmlFor="acc-last" className="field-label">Last name</label>
                <input id="acc-last" required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} className="field-input" />
              </div>
            </div>
          ) : null}
          <div>
            <label htmlFor="acc-email" className="field-label">Email address</label>
            <input id="acc-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className="field-input" />
          </div>
          {mode === 'register' ? (
            <div>
              <label htmlFor="acc-phone" className="field-label">
                Phone number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="acc-phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" value={form.phone} onChange={set('phone')} className="field-input" />
            </div>
          ) : null}
          <div>
            <label htmlFor="acc-password" className="field-label">Password</label>
            <input
              id="acc-password"
              type="password"
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={set('password')}
              aria-describedby={mode === 'register' ? 'acc-password-hint' : undefined}
              className="field-input"
            />
            {mode === 'register' ? (
              <p id="acc-password-hint" className="mt-1.5 text-sm text-slate-500">
                At least 8 characters, with a letter and a number.
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              <AlertIcon size={18} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Spinner /> : null}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ user, onSignedOut }: { user: SessionUserDTO; onSignedOut: () => void }) {
  const { refresh } = useCart();
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
      await apiFetch('/api/auth/logout', { method: 'POST' });
      await refresh();
      onSignedOut();
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
              Open admin portal
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
