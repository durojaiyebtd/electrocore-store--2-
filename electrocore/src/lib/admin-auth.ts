/**
 * Admin access control. The session cookie says who is signed in; the database
 * is checked on every request so a demoted admin loses access immediately.
 */
import { prisma } from './prisma';
import { getSession } from './auth';
import { ApiError } from './http';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') return null;
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
}

/** For admin API controllers: returns the admin or throws 401/403. */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, 'Please sign in to the admin portal.', 'UNAUTHENTICATED');
  }
  const admin = await getAdminUser();
  if (!admin) {
    throw new ApiError(403, 'This account does not have admin access.', 'FORBIDDEN');
  }
  return admin;
}
