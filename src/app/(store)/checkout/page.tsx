import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutView } from '@/components/checkout/CheckoutView';
import { getSession } from '@/lib/auth';
import { getGuestEmail } from '@/lib/guest-checkout';

export const metadata: Metadata = { title: 'Secure checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Checkout sign-in gateway. Browsing and the cart are open to everyone, but to
 * pay a shopper must be signed in or have chosen "continue as guest". Anyone
 * else is sent to the checkout sign-in screen and returned here afterwards.
 */
export default async function CheckoutPage() {
  const [session, guestEmail] = await Promise.all([getSession(), getGuestEmail()]);
  if (!session && !guestEmail) redirect('/checkout/auth?next=/checkout');
  return <CheckoutView guestEmail={session ? null : guestEmail} />;
}
