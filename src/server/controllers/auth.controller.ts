import type { NextRequest } from 'next/server';
import { ok, parseBody } from '@/lib/http';
import { clearGuestEmail, setGuestEmail } from '@/lib/guest-checkout';
import { forgotPasswordSchema, guestSchema, loginSchema, registerSchema, resetPasswordSchema } from '@/lib/validators';
import * as passwordReset from '../services/password-reset.service';
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

/** POST /api/auth/guest — remembers a guest's email so they can pass the checkout sign-in gateway */
export async function guest(req: NextRequest) {
  const { email } = await parseBody(req, guestSchema);
  await setGuestEmail(email);
  return ok({ email });
}

/** POST /api/auth/logout */
export async function logout() {
  await authService.logout();
  await clearCartCookie();
  await clearGuestEmail();
  return ok({ loggedOut: true });
}

/** GET /api/auth/me */
export async function me() {
  return ok({ user: await authService.currentUser() });
}

/** POST /api/auth/forgot-password — always answers the same way, whether or not the email has an account */
export async function forgotPassword(req: NextRequest) {
  const { email } = await parseBody(req, forgotPasswordSchema);
  await passwordReset.requestPasswordReset(email);
  return ok({ message: 'If an account exists for that email, a reset link has been sent.' });
}

/** POST /api/auth/reset-password */
export async function resetPassword(req: NextRequest) {
  const { token, password } = await parseBody(req, resetPasswordSchema);
  await passwordReset.resetPassword(token, password);
  return ok({ reset: true });
}
