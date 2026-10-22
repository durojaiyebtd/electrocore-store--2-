import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SuccessView } from '@/components/checkout/SuccessView';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = { title: 'Order confirmation', robots: { index: false } };

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page grid h-96 place-items-center text-brand-600">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <SuccessView />
    </Suspense>
  );
}
