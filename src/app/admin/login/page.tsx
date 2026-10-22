import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AdminLoginView } from '@/components/admin/AdminLoginView';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect('/admin');
  return (
    <Suspense fallback={null}>
      <AdminLoginView />
    </Suspense>
  );
}
