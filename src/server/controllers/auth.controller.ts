import type { NextRequest } from 'next/server';
import { ok, parseBody } from '@/lib/http';
import { loginSchema, registerSchema } from '@/lib/validators';
import * as authService from '../services/auth.service';
import { clearCartCookie } from '../services/cart.service';

/** POST /api/auth/register */
export async function register(req: NextRequest) {
  const input = await parseBody(req, registerSchema);
  return ok({ user: await authService.register(input) }, { status: 201 });
}

/** POST /api/auth/login */
export async function login(req: NextRequest) {
  const input = await parseBody(req, loginSchema);
  return ok({ user: await authService.login(input) });
}

/** POST /api/auth/logout */
export async function logout() {
  await authService.logout();
  await clearCartCookie();
  return ok({ loggedOut: true });
}

/** GET /api/auth/me — also refreshes the session cookie if the account's role changed */
export async function me() {
  return ok({ user: await authService.currentUserWithFreshSession() });
}
