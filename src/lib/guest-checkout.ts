/**
 * "Guest email" checkout support.
 *
 * A shopper who does not want an account types their email once on the
 * checkout sign-in screen. The server remembers it in a short-lived, httpOnly
 * cookie so (a) the /checkout page knows the gateway has been passed and
 * (b) the checkout form can pre-fill the email.
 */
import { cookies } from 'next/headers';

export const GUEST_COOKIE = 'mes_guest_email';
const GUEST_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export async function setGuestEmail(email: string): Promise<void> {
  const store = await cookies();
  store.set(GUEST_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_MAX_AGE_SECONDS,
  });
}

export async function getGuestEmail(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(GUEST_COOKIE)?.value;
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

export async function clearGuestEmail(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
}

/**
 * Only allow redirects to pages on this website (never to another domain).
 * Used for the "?next=" parameter that returns shoppers to checkout.
 */
export function safeNextPath(value: string | null | undefined, fallback = '/checkout'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
