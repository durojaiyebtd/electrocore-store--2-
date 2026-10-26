import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordView } from '@/components/admin/AdminResetViews';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  );
}
