'use client';

/**
 * Checkout sign-in step. Shown instead of the delivery form when nobody is signed in.
 * The guest cart is kept: signing in or creating an account merges it into the account,
 * and the shopper continues straight to delivery details and Paystack.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { CheckIcon, LockIcon } from '@/components/ui/Icons';
import type { SessionUserDTO } from '@/types';

interface CheckoutAuthGateProps {
  /** Order summary rendered beside the form, so shoppers can see what they're buying. */
  summary: ReactNode;
  /** Set when a payment attempt was refused because the session had ended. */
  sessionExpired: boolean;
  onAuthenticated: (user: SessionUserDTO) => void;
}

const REASONS = [
  'Track your order and delivery from your account',
  'Your receipt and Paystack reference are saved for you',
  'Faster checkout next time: your details are filled in',
];

export function CheckoutAuthGate({ summary, sessionExpired, onAuthenticated }: CheckoutAuthGateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
      <section aria-labelledby="checkout-auth-heading" className="max-w-xl">
        <h2 id="checkout-auth-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none">
          Sign in to complete your order
        </h2>
        {sessionExpired ? (
          <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            Your session ended before payment started. Sign in again and we&apos;ll take you straight to Paystack. Your details and cart are kept.
          </p>
        ) : (
          <p className="mt-2 text-slate-600">
            Your cart is saved. Sign in, or create an account in under a minute, and you&apos;ll go straight on to delivery and payment.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <AuthForm
            idPrefix="checkout-auth"
            initialMode="login"
            submitLabels={{ login: 'Sign in and continue', register: 'Create account and continue' }}
            onSuccess={onAuthenticated}
          />
        </div>

        <ul className="mt-6 space-y-2 text-sm text-slate-600">
          {REASONS.map((reason) => (
            <li key={reason} className="flex gap-2">
              <CheckIcon size={18} className="mt-0.5 shrink-0 text-brand-600" />
              {reason}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <LockIcon size={16} className="text-brand-600" />
          Payments are processed by Paystack. We never see or store your card details.
        </p>
      </section>

      {summary}
    </div>
  );
}
