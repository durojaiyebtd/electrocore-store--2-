'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { LogoMark } from '@/components/layout/Logo';
import { AlertIcon, LockIcon } from '@/components/ui/Icons';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-100 via-white to-amber-100 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-bold text-slate-900">ElectroCore</p>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-2xl">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/admin/login" className="underline-offset-4 hover:text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
      <AlertIcon size={18} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

export function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Forgot your password?" subtitle="Reset password">
      {sent ? (
        <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          If an account exists for <strong>{email}</strong>, a reset link has been sent. It is valid for 30 minutes. Check your spam folder too.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="mt-1 text-sm text-slate-500">Enter your account email and we will send you a link to choose a new password.</p>
          <div className="mt-6">
            <label htmlFor="reset-email" className="field-label">Email address</label>
            <input id="reset-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
          </div>
          {error ? <ErrorBox message={error} /> : null}
          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? <Spinner /> : <LockIcon size={18} />}
            Send reset link
          </button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPasswordView() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Choose a new password" subtitle="Reset password">
      {done ? (
        <div className="mt-4">
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            Your password has been changed. You can sign in now.
          </p>
          <Link href="/admin/login" className="btn-primary mt-6 w-full">Go to sign in</Link>
        </div>
      ) : !token ? (
        <ErrorBox message="This reset link is not valid. Please request a new one." />
      ) : (
        <form onSubmit={submit}>
          <p className="mt-1 text-sm text-slate-500">At least 8 characters, with a letter and a number.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-password" className="field-label">New password</label>
              <PasswordInput id="new-password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label htmlFor="confirm-password" className="field-label">Confirm new password</label>
              <PasswordInput id="confirm-password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          {error ? <ErrorBox message={error} /> : null}
          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? <Spinner /> : <LockIcon size={18} />}
            Change password
          </button>
        </form>
      )}
    </Shell>
  );
}
