'use client';

/**
 * Checkout sign-in screen. Shoppers browse and fill their cart without an
 * account; only when they press "Checkout securely" do they land here to
 *   1. Sign in,
 *   2. Create an account in one step (Quick signup), or
 *   3. Continue as a guest with just an email address.
 * After any of these they are sent straight back to checkout to pay with Paystack.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { AlertIcon, LockIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { SessionUserDTO } from '@/types';

type Mode = 'login' | 'register' | 'guest';

const TABS: Array<{ mode: Mode; label: string }> = [
  { mode: 'login', label: 'Sign in' },
  { mode: 'register', label: 'Quick signup' },
  { mode: 'guest', label: 'Guest' },
];

export function CheckoutAuthView({ next }: { next: string }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const { cart, refresh } = useCart();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'guest') {
        await apiFetch<{ email: string }>('/api/auth/guest', { method: 'POST', body: { email: form.email } });
      } else {
        const body =
          mode === 'login'
            ? { email: form.email, password: form.password }
            : { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, phone: form.phone };
        const { user } = await apiFetch<{ user: SessionUserDTO }>(`/api/auth/${mode}`, { method: 'POST', body });
        setUser(user);
        await refresh(); // the guest cart is merged into the account
      }
      // Back to checkout to complete the Naira payment with Paystack
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-700">
            <LockIcon size={16} /> Secure checkout
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">How would you like to check out?</h1>
          <p className="mt-2 text-slate-600">Your cart is saved. Choose an option below and you will come straight back to pay.</p>

          <div className="mt-8 grid grid-cols-3 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Checkout options">
            {TABS.map((tab) => (
              <button
                key={tab.mode}
                type="button"
                role="tab"
                aria-selected={mode === tab.mode}
                onClick={() => {
                  setMode(tab.mode);
                  setError(null);
                }}
                className={cn('h-10 rounded-md text-sm font-semibold transition', mode === tab.mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ca-first" className="field-label">First name</label>
                  <input id="ca-first" required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} className="field-input" />
                </div>
                <div>
                  <label htmlFor="ca-last" className="field-label">Last name</label>
                  <input id="ca-last" required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} className="field-input" />
                </div>
              </div>
            ) : null}

            <div>
              <label htmlFor="ca-email" className="field-label">Email address</label>
              <input id="ca-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className="field-input" />
              {mode === 'guest' ? <p className="mt-1.5 text-sm text-slate-500">We send your receipt and delivery updates here. No account or password needed.</p> : null}
            </div>

            {mode === 'register' ? (
              <div>
                <label htmlFor="ca-phone" className="field-label">
                  Phone number <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input id="ca-phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" value={form.phone} onChange={set('phone')} className="field-input" />
              </div>
            ) : null}

            {mode !== 'guest' ? (
              <div>
                <label htmlFor="ca-password" className="field-label">Password</label>
                <input
                  id="ca-password"
                  type="password"
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={set('password')}
                  className="field-input"
                />
                {mode === 'register' ? <p className="mt-1.5 text-sm text-slate-500">At least 8 characters, with a letter and a number.</p> : null}
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                <AlertIcon size={18} className="mt-0.5 shrink-0" />
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Spinner /> : null}
              {mode === 'login' ? 'Sign in and continue' : mode === 'register' ? 'Create account and continue' : 'Continue as guest'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            <Link href="/cart" className="font-medium text-brand-700 underline-offset-4 hover:underline">
              Back to cart
            </Link>
          </p>
        </div>

        <aside className="h-fit rounded-xl border border-brand-100 bg-brand-50 p-5" aria-label="Order summary">
          <h2 className="text-base font-semibold text-slate-900">Your cart</h2>
          <p className="mt-1 text-sm text-slate-600">
            {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}
          </p>
          <p className="mt-4 text-2xl font-semibold tabular-nums text-slate-900">{formatMoney(cart.subtotal)}</p>
          <p className="mt-1 text-sm text-slate-500">Delivery is added at the next step. You pay in Naira (₦) through Paystack.</p>
        </aside>
      </div>
    </div>
  );
}
