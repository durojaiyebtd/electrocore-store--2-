'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { LogoMark } from '@/components/layout/Logo';
import { AlertIcon, LockIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import type { SessionUserDTO } from '@/types';

/** Only allow redirects to admin pages on this site. */
function safeNext(value: string | null): string {
  return value && value.startsWith('/admin') && !value.startsWith('//') ? value : '/admin';
}

export function AdminLoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { user } = await apiFetch<{ user: SessionUserDTO }>('/api/auth/login', { method: 'POST', body: { email, password } });
      if (user.role !== 'ADMIN') {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        setError('This account does not have admin access. Ask an existing admin to grant it under Customers.');
        setBusy(false);
        return;
      }
      router.push(safeNext(searchParams.get('next')));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-100 via-white to-amber-100 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-bold text-slate-900">ElectroCore</p>
            <p className="text-sm text-slate-500">Admin portal</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 rounded-2xl bg-white p-6 shadow-2xl">
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Use an account with admin access.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-email" className="field-label">Email address</label>
              <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
            </div>
            <div>
              <label htmlFor="admin-password" className="field-label">Password</label>
              <input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              <AlertIcon size={18} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? <Spinner /> : <LockIcon size={18} />}
            Sign in to admin
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="underline-offset-4 hover:text-brand-700 hover:underline">
            Back to the store
          </Link>
        </p>
      </div>
    </main>
  );
}
