/**
 * Server-only random identifiers (uses Node's crypto module).
 * Do not import this file from client components.
 */
import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Random code using an unambiguous alphabet (no 0/O, 1/I). */
export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Human-friendly order number, e.g. MES-261021-7KQ2M */
export function generateOrderNumber(date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `MES-${yy}${mm}${dd}-${randomCode(5)}`;
}

/** Paystack transaction reference (letters, digits and dashes are allowed). */
export function generatePaymentReference(orderNumber: string): string {
  return `${orderNumber}-${randomCode(6)}`;
}

/** Secure random token for guest carts. */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}
