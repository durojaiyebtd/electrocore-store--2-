/**
 * JWT helpers with no Next.js-specific imports, so they run both in normal
 * server code and in middleware (Edge runtime).
 */
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'mes_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set in .env and be at least 32 characters long.');
  }
  return new TextEncoder().encode(secret);
}

export function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.email !== 'string') return null;
    const role = payload.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
    return { userId: payload.sub, email: payload.email, role };
  } catch {
    return null;
  }
}
