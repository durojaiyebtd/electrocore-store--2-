import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { getAdminUser } from '@/lib/admin-auth';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Every page inside the portal is rendered only for a verified admin. The middleware
 * already checked the session cookie; this re-checks the role in the database, so an
 * account that lost admin access is turned away even if its cookie still says ADMIN.
 */
export default async function AdminPortalLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) {
    const session = await getSession();
    redirect(`/?unauthorized=${session ? 'forbidden' : 'sign-in'}`);
  }
  return <AdminShell admin={{ firstName: admin.firstName, lastName: admin.lastName, email: admin.email }}>{children}</AdminShell>;
}
