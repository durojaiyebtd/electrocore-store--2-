'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { REPAIR_STATUS_LABEL, type RepairStatusValue } from '@/lib/repair-constants';

interface Mine { reference: string; accessCode: string; deviceLabel: string; faultSummary: string; status: RepairStatusValue; createdAt: string }

export function RepairLookupView() {
  const router = useRouter();
  const { user } = useAuth();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Mine[]>([]);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ requests: Mine[] }>('/api/repairs/my').then((r) => setMine(r.requests)).catch(() => setMine([]));
  }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { accessCode } = await apiFetch<{ accessCode: string }>('/api/repairs/lookup', { method: 'POST', body: { reference, email } });
      router.push(`/repairs/t/${accessCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not find that request.');
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Find your request</h2>
        <div>
          <label htmlFor="lk-ref" className="field-label">Reference (starts with RR-)</label>
          <input id="lk-ref" value={reference} onChange={(e) => setReference(e.target.value)} className="field-input font-mono uppercase" placeholder="RR-XXXXXXX" required />
        </div>
        <div>
          <label htmlFor="lk-email" className="field-label">Email used for the request</label>
          <input id="lk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" required />
        </div>
        {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Spinner /> : null} Open my request</button>
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Your account’s requests</h2>
        {!user ? <p className="mt-3 text-sm text-slate-600">Signed-in customers see their requests here. <Link href="/login?next=/repairs/track" className="font-semibold text-brand-700 underline">Sign in</Link></p>
          : mine.length === 0 ? <p className="mt-3 text-sm text-slate-600">No requests are linked to your account yet.</p>
          : <ul className="mt-3 divide-y divide-slate-100">{mine.map((m) => (
              <li key={m.reference} className="py-3 text-sm"><Link className="font-mono font-semibold text-brand-700 underline" href={`/repairs/t/${m.accessCode}`}>{m.reference}</Link> · {m.deviceLabel}<span className="block text-slate-600">{m.faultSummary} · {REPAIR_STATUS_LABEL[m.status]}</span></li>
            ))}</ul>}
      </div>
    </div>
  );
}
