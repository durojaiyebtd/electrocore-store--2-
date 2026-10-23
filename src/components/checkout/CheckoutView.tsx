'use client';

/**
 * Checkout: delivery details -> server creates the order -> redirect to Paystack.
 * The server recalculates every price, stock level and delivery fee; the summary
 * here is a live preview so shoppers see the exact total before paying.
 */
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { AlertIcon, LockIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { ClientApiError, apiFetch } from '@/lib/api-client';
import { CURRENCIES, formatMoney, getStoreCurrency } from '@/lib/currency';
import { NIGERIAN_STATES, quoteShipping } from '@/lib/shipping';
import { cn } from '@/lib/utils';
import type { CheckoutInitDTO, SessionUserDTO } from '@/types';
import { ProductImage } from '@/components/product/ProductImage';

interface FormState {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  notes: '',
};

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (form.firstName.trim().length < 2) errors.firstName = 'First name is required.';
  if (form.lastName.trim().length < 2) errors.lastName = 'Last name is required.';
  if (!/^(\+?234|0)[789][01]\d{8}$/.test(form.phone.replace(/[\s()-]/g, ''))) errors.phone = 'Enter a valid Nigerian phone number, e.g. 0803 123 4567.';
  if (form.line1.trim().length < 5) errors.line1 = 'Enter your street address.';
  if (form.city.trim().length < 2) errors.city = 'Enter your city or town.';
  if (!form.state) errors.state = 'Select your state.';
  return errors;
}

const STEPS = ['Cart', 'Details', 'Payment', 'Confirmation'];

export function CheckoutView({ guestEmail = null }: { guestEmail?: string | null }) {
  const { cart, loading } = useCart();
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, email: guestEmail ?? '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Prefill from the signed-in account
  useEffect(() => {
    apiFetch<{ user: SessionUserDTO | null }>('/api/auth/me')
      .then(({ user }) => {
        if (!user) return;
        setForm((f) => ({
          ...f,
          email: f.email || user.email,
          firstName: f.firstName || user.firstName,
          lastName: f.lastName || user.lastName,
          phone: f.phone || user.phone || '',
        }));
      })
      .catch(() => undefined);
  }, []);

  const quote = useMemo(() => quoteShipping(cart.subtotal, form.state, cart.hasPhysicalItems), [cart.subtotal, form.state, cart.hasPhysicalItems]);
  const total = cart.subtotal + quote.fee;
  const hasUnavailable = cart.items.some((item) => !item.available);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`checkout-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiFetch<CheckoutInitDTO>('/api/checkout', {
        method: 'POST',
        body: {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, postalCode: form.postalCode },
          notes: form.notes,
        },
      });
      window.location.assign(result.authorizationUrl);
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'CHECKOUT_AUTH_REQUIRED') {
        // The guest/sign-in session expired while the form was open
        window.location.assign('/checkout/auth?next=/checkout');
        return;
      }
      setServerError(err instanceof Error ? err.message : 'Could not start payment. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container-page grid h-96 place-items-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-slate-600">Add something to your cart before checking out.</p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse the catalog
        </Link>
      </div>
    );
  }

  const field = (key: keyof FormState, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}, optional = false) => (
    <div>
      <label htmlFor={`checkout-${key}`} className="field-label">
        {label} {optional ? <span className="font-normal text-slate-400">(optional)</span> : null}
      </label>
      <input
        id={`checkout-${key}`}
        name={key}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `checkout-${key}-error` : undefined}
        className="field-input"
        {...props}
      />
      {errors[key] ? (
        <p id={`checkout-${key}-error`} className="field-error">
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="container-page py-8 sm:py-12">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label="Checkout progress">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-3">
            <span className={cn('flex items-center gap-2', index === 1 ? 'font-semibold text-slate-900' : 'text-slate-500')} aria-current={index === 1 ? 'step' : undefined}>
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold',
                  index < 1 ? 'bg-brand-600 text-white' : index === 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600',
                )}
              >
                {index + 1}
              </span>
              {step}
            </span>
            {index < STEPS.length - 1 ? <span className="h-px w-6 bg-slate-300" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Checkout</h1>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-900">Contact</legend>
            {guestEmail ? (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
                Checking out as a guest.{' '}
                <Link href="/checkout/auth?next=/checkout" className="font-semibold underline">
                  Sign in or create an account instead
                </Link>
              </p>
            ) : null}
            {field('email', 'Email address', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
            <p className="-mt-2 text-sm text-slate-500">Your receipt and order updates go here.</p>
            {field('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '0803 123 4567' })}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-900">{cart.hasPhysicalItems ? 'Delivery address' : 'Billing address'}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('firstName', 'First name', { autoComplete: 'given-name' })}
              {field('lastName', 'Last name', { autoComplete: 'family-name' })}
            </div>
            {field('line1', 'Street address', { autoComplete: 'address-line1', placeholder: 'House number and street' })}
            {field('line2', 'Apartment, landmark or nearest bus stop', { autoComplete: 'address-line2' }, true)}
            <div className="grid gap-4 sm:grid-cols-3">
              {field('city', 'City / town', { autoComplete: 'address-level2' })}
              <div>
                <label htmlFor="checkout-state" className="field-label">
                  State
                </label>
                <select
                  id="checkout-state"
                  name="state"
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  aria-invalid={errors.state ? true : undefined}
                  aria-describedby={errors.state ? 'checkout-state-error' : undefined}
                  autoComplete="address-level1"
                  className="field-input"
                >
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state ? (
                  <p id="checkout-state-error" className="field-error">
                    {errors.state}
                  </p>
                ) : null}
              </div>
              {field('postalCode', 'Postal code', { autoComplete: 'postal-code', inputMode: 'numeric' }, true)}
            </div>
            <div>
              <label htmlFor="checkout-notes" className="field-label">
                Order notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="checkout-notes"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Delivery instructions, preferred service date, device fault description…"
                className="field-input h-auto py-3"
              />
            </div>
          </fieldset>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
          <ul className="mt-4 max-h-80 divide-y divide-slate-200 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3">
                <div className="relative h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-white">
                  <ProductImage src={item.image} alt="" className="h-full w-full rounded-lg object-contain" />
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[0.7rem] font-semibold text-white">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-slate-900">{item.productName}</p>
                  {item.variantName !== 'Standard' ? <p className="text-xs text-slate-500">{item.variantName}</p> : null}
                  {!item.available ? <p className="text-xs font-medium text-rose-700">No longer available</p> : null}
                </div>
                <p className="text-sm font-medium text-slate-900 tabular-nums">{formatMoney(item.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2.5 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="text-slate-900 tabular-nums">{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">
                Delivery
                {quote.eta ? <span className="block text-xs text-slate-400">{quote.zoneLabel}, {quote.eta}</span> : null}
              </dt>
              <dd className="text-right text-slate-900 tabular-nums">
                {quote.reason === 'STATE_REQUIRED' ? 'Select a state' : quote.fee === 0 ? 'Free' : formatMoney(quote.fee)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-2xl font-semibold text-slate-900 tabular-nums" aria-live="polite">
              {formatMoney(total)}
            </span>
          </div>

          {serverError ? (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              <AlertIcon size={18} className="mt-0.5 shrink-0" />
              <span>
                {serverError}{' '}
                {/stock|available|sold out|cart/i.test(serverError) ? (
                  <Link href="/cart" className="font-semibold underline">
                    Review cart
                  </Link>
                ) : null}
              </span>
            </p>
          ) : null}

          <button type="submit" disabled={submitting || hasUnavailable} className="btn-primary mt-6 w-full">
            {submitting ? <Spinner /> : <LockIcon size={18} />}
            {submitting ? 'Connecting to Paystack…' : `Pay ${formatMoney(total)}`}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
            You will be taken to Paystack to pay securely in {CURRENCIES[getStoreCurrency()].name} by card, bank transfer or USSD. We never see
            or store your card details.
          </p>
          <p className="mt-3 text-center text-xs text-slate-500">
            By placing this order you agree to our{' '}
            <Link href="/policies/terms" className="underline">
              terms
            </Link>{' '}
            and{' '}
            <Link href="/policies/returns" className="underline">
              returns policy
            </Link>
            .
          </p>
        </aside>
      </form>
    </div>
  );
}
