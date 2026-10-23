import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CheckoutAuthView } from '@/components/checkout/CheckoutAuthView';
import { getSession } from '@/lib/auth';
import { safeNextPath } from '@/lib/guest-checkout';

export const metadata: Metadata = { title: 'Sign in to check out', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Checkout sign-in screen: Login, Quick Signup or Guest Email. Skipped when the shopper already has a session. */
export default async function CheckoutAuthPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  const session = await getSession();
  if (session) redirect(target);
  return (
    <Suspense fallback={null}>
      <CheckoutAuthView next={target} />
    </Suspense>
  );
}
