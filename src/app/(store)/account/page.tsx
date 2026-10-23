import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountView } from '@/components/account/AccountView';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page grid h-80 place-items-center text-brand-600">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <AccountView />
    </Suspense>
  );
}
