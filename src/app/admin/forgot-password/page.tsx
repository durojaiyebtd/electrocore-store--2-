import type { Metadata } from 'next';
import { ForgotPasswordView } from '@/components/admin/AdminResetViews';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
