'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';

interface Result { status: 'success' | 'failed' | 'pending'; message: string; accessCode: string | null }

export function PayCallbackView() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref') ?? '';
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) { setError('No payment reference was found in this link.'); return; }
    let tries = 0;
    let stop = false;
    async function check() {
      try {
        const r = await apiFetch<Result>(`/api/repairs/pay/verify?reference=${encodeURIComponent(reference)}`);
        if (stop) return;
        setResult(r);
        if (r.status === 'pending' && tries++ < 10) setTimeout(check, 3000);
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : 'Could not confirm the payment.');
      }
    }
    void check();
    return () => { stop = true; };
  }, [reference]);

  if (error) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">{error}</p>;
  if (!result) return <p className="flex items-center gap-3 text-slate-600"><Spinner className="h-5 w-5" /> Confirming your payment…</p>;
  return (
    <div className={`rounded-xl border p-6 ${result.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : result.status === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`} role="status">
      <p className="text-lg font-semibold">{result.message}</p>
      {result.accessCode ? <Link href={`/repairs/t/${result.accessCode}`} className="btn-primary mt-4">Back to my repair request</Link> : null}
    </div>
  );
}
