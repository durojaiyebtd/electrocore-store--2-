'use client';

/**
 * Paystack redirects here with ?reference=... We ask our server to verify the
 * payment with Paystack (never trusting the URL alone) and show the result.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { AlertIcon, CheckIcon, MailIcon, TruckIcon, WrenchIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/utils';
import type { OrderDTO, VerifyResultDTO } from '@/types';
import { ProductImage } from '@/components/product/ProductImage';

const MAX_POLLS = 8;

export function SuccessView() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  const { refresh } = useCart();
  const [result, setResult] = useState<VerifyResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const polls = useRef(0);

  useEffect(() => {
    if (!reference) {
      setError('No payment reference was provided.');
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      try {
        const data = await apiFetch<VerifyResultDTO>(`/api/checkout/verify?reference=${encodeURIComponent(reference)}`);
        if (cancelled) return;
        setResult(data);
        if (data.status === 'success') {
          void refresh(); // cart was cleared on the server
        } else if (data.status === 'pending' && polls.current < MAX_POLLS) {
          polls.current += 1;
          timer = setTimeout(check, 3000);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'We could not confirm your payment.');
      }
    };
    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reference, refresh]);

  if (error) {
    return (
      <StatusShell tone="error" title="We couldn’t confirm this payment">
        <p>{error}</p>
        <p className="mt-2">
          If you were charged, contact support with your reference{reference ? <span className="font-mono"> {reference}</span> : null} and we will
          resolve it quickly.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/checkout" className="btn-primary">
            Return to checkout
          </Link>
          <Link href="/contact" className="btn-secondary">
            Contact support
          </Link>
        </div>
      </StatusShell>
    );
  }

  if (!result || (result.status === 'pending' && polls.current < MAX_POLLS)) {
    return (
      <div className="container-page flex flex-col items-center py-28 text-center" aria-live="polite">
        <Spinner className="h-10 w-10 text-brand-600" />
        <h1 className="mt-6 text-xl font-semibold text-slate-900">Confirming your payment with Paystack…</h1>
        <p className="mt-2 text-slate-600">This usually takes a few seconds. Please don’t close this page.</p>
      </div>
    );
  }

  if (result.status === 'failed' || result.status === 'pending') {
    return (
      <StatusShell tone={result.status === 'failed' ? 'error' : 'warning'} title={result.status === 'failed' ? 'Payment not completed' : 'Payment still processing'}>
        <p>{result.message}</p>
        {result.status === 'pending' ? (
          <p className="mt-2">We’ll email you as soon as Paystack confirms it. You don’t need to pay again.</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/checkout" className="btn-primary">
            {result.status === 'failed' ? 'Try payment again' : 'Back to checkout'}
          </Link>
          <Link href="/cart" className="btn-secondary">
            View cart
          </Link>
        </div>
      </StatusShell>
    );
  }

  return result.order ? <Confirmation order={result.order} /> : null;
}

function StatusShell({ tone, title, children }: { tone: 'error' | 'warning'; title: string; children: ReactNode }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className={tone === 'error' ? 'grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-rose-700' : 'grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-700'}>
        <AlertIcon size={30} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">{title}</h1>
      <div className="mt-3 max-w-lg text-slate-600">{children}</div>
    </div>
  );
}

function Confirmation({ order }: { order: OrderDTO }) {
  const hasPhysical = order.items.some((item) => item.fulfillment === 'PHYSICAL');
  const hasDigital = order.items.some((item) => item.fulfillment === 'DIGITAL');
  const hasService = order.items.some((item) => item.fulfillment === 'SERVICE');

  const nextSteps = [
    { show: true, icon: MailIcon, text: `Paystack has emailed your payment receipt to ${order.email}. Keep your order number for any enquiries.` },
    { show: hasPhysical, icon: TruckIcon, text: `We’ll call ${order.phone} to confirm delivery to ${order.shippingAddress.city}, ${order.shippingAddress.state}.` },
    { show: hasDigital, icon: MailIcon, text: `Our team will email licence keys for software items to ${order.email} during business hours.` },
    { show: hasService, icon: WrenchIcon, text: 'Our engineers will contact you within one business day to schedule your service.' },
  ].filter((step) => step.show);

  return (
    <div className="container-page max-w-4xl py-10 sm:py-16">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckIcon size={32} />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Thank you, your order is confirmed</h1>
          <p className="mt-1 text-slate-600">
            Order <span className="font-mono font-medium text-slate-900">{order.orderNumber}</span>
            {order.paidAt ? <> · paid {formatDate(order.paidAt)}</> : null}
          </p>
        </div>
      </div>

      <ul className="mt-8 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        {nextSteps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.text} className="flex gap-3 text-sm text-slate-800">
              <Icon size={18} className="mt-0.5 shrink-0 text-emerald-700" />
              {step.text}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="items-heading" className="rounded-2xl border border-slate-200 p-6">
          <h2 id="items-heading" className="text-lg font-semibold text-slate-900">
            Items
          </h2>
          <ul className="mt-3 divide-y divide-slate-200">
            {order.items.map((item) => (
              <li key={item.sku} className="flex gap-4 py-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <ProductImage src={item.image} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                  <p className="text-xs text-slate-500">
                    {item.variantName !== 'Standard' ? `${item.variantName} · ` : ''}Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums text-slate-900">{formatMoney(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Delivery</dt>
              <dd className="tabular-nums">{order.shippingFee === 0 ? 'Free' : formatMoney(order.shippingFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
              <dt>Total paid</dt>
              <dd className="tabular-nums">{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="address-heading" className="rounded-2xl border border-slate-200 p-6 text-sm">
            <h2 id="address-heading" className="text-lg font-semibold text-slate-900">
              {hasPhysical ? 'Delivering to' : 'Billing details'}
            </h2>
            <address className="mt-3 not-italic leading-relaxed text-slate-700">
              {order.customerName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? (
                <>
                  <br />
                  {order.shippingAddress.line2}
                </>
              ) : null}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}
              <br />
              {order.phone}
            </address>
          </section>
          {order.payment ? (
            <section aria-labelledby="payment-heading" className="rounded-2xl border border-slate-200 p-6 text-sm">
              <h2 id="payment-heading" className="text-lg font-semibold text-slate-900">
                Payment
              </h2>
              <dl className="mt-3 space-y-1.5 text-slate-700">
                <div className="flex justify-between gap-4">
                  <dt>Method</dt>
                  <dd className="capitalize">{order.payment.channel?.replace(/_/g, ' ') ?? 'Paystack'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Reference</dt>
                  <dd className="break-all text-right font-mono text-xs">{order.payment.reference}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3 print:hidden">
        <Link href="/shop" className="btn-primary">
          Continue shopping
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-secondary">
          Print receipt
        </button>
        <Link href="/account" className="btn-secondary">
          View my orders
        </Link>
      </div>
    </div>
  );
}
