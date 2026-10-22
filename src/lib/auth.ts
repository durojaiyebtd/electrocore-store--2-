/**
 * Cookie-based sessions signed with JWT (HS256 via `jose`).
 * The session cookie is httpOnly, so browser JavaScript can never read it.
 */
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from './session-token';

export { SESSION_COOKIE };
export type { SessionPayload };

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
