import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AdminLoginView } from '@/components/admin/AdminLoginView';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Where the admin middleware sends anyone who is not signed in as an admin.
 * Admins continue to the portal; customers are taken to their account.
 */
export default async function LoginPage() {
  if (await getAdminUser()) redirect('/admin');
  return (
    <Suspense fallback={null}>
      <AdminLoginView />
    </Suspense>
  );
}
