/**
 * Account registration, login and profile lookup.
 */
import bcrypt from 'bcryptjs';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { createSession, destroySession, getSession } from '@/lib/auth';
import type { loginSchema, registerSchema } from '@/lib/validators';
import type { SessionUserDTO } from '@/types';
import { resolveCart } from './cart.service';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

function toSessionUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
}): SessionUserDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
  };
}

export async function register(input: RegisterInput): Promise<SessionUserDTO> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists. Please sign in instead.', 'EMAIL_TAKEN');
  }
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
    },
  });
  await createSession({ userId: user.id, email: user.email, role: user.role });
  await resolveCart({ create: false, userId: user.id }); // links any guest cart to the new account
  return toSessionUser(user);
}

export async function login(input: LoginInput): Promise<SessionUserDTO> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same message for unknown email and wrong password, so attackers can't probe accounts.
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) {
    throw new ApiError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  await createSession({ userId: user.id, email: user.email, role: user.role });
  await resolveCart({ create: false, userId: user.id }); // merges the guest cart into the user's cart
  return toSessionUser(user);
}

export async function logout(): Promise<void> {
  await destroySession();
}

export async function currentUser(): Promise<SessionUserDTO | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user ? toSessionUser(user) : null;
}
