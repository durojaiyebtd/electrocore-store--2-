import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Every page inside the portal is rendered only for a verified admin. */
export default async function AdminPortalLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect('/login');
  return <AdminShell admin={{ firstName: admin.firstName, lastName: admin.lastName, email: admin.email }}>{children}</AdminShell>;
}
