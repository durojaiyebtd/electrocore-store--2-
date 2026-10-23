'use client';

/**
 * Sign in / quick sign-up form, used by the account page and the checkout sign-in step.
 * New accounts are always created with the CUSTOMER role (the server ignores any role
 * sent by the browser); admins are promoted with `npm run seed:admin` or in the portal.
 */
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AlertIcon, EyeIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { ClientApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { SessionUserDTO } from '@/types';

export type AuthMode = 'login' | 'register';

interface AuthFormProps {
  /** Prefix for input ids, so two forms on one page never share an id. */
  idPrefix: string;
  initialMode?: AuthMode;
  /** Wording of the main button, e.g. "Sign in and continue". */
  submitLabels?: { login: string; register: string };
  onSuccess: (user: SessionUserDTO) => void | Promise<void>;
}

type Field = 'firstName' | 'lastName' | 'email' | 'phone' | 'password';
type FieldErrors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?234|0)[789][01]\d{8}$/;

function validate(mode: AuthMode, form: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (mode === 'login') {
    if (!form.password) errors.password = 'Enter your password.';
    return errors;
  }
  if (form.firstName.trim().length < 2) errors.firstName = 'Enter your first name.';
  if (form.lastName.trim().length < 2) errors.lastName = 'Enter your last name.';
  if (form.phone.trim() && !PHONE_RE.test(form.phone.replace(/[\s()-]/g, ''))) errors.phone = 'Enter a Nigerian number, e.g. 0803 123 4567.';
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'Use at least 8 characters, with a letter and a number.';
  }
  return errors;
}

export function AuthForm({ idPrefix, initialMode = 'login', submitLabels, onSuccess }: AuthFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState<Record<Field, string>>({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<{ message: string; code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const labels = submitLabels ?? { login: 'Sign in', register: 'Create account' };
  const id = (field: Field) => `${idPrefix}-${field}`;

  function switchMode(next: AuthMode) {
    setMode(next);
    setErrors({});
    setServerError(null);
  }

  const set = (field: Field) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const found = validate(mode, form);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as Field[])[0];
    if (firstInvalid) {
      document.getElementById(id(firstInvalid))?.focus();
      return;
    }
    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await signIn({ email: form.email.trim(), password: form.password })
          : await signUp({
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              password: form.password,
            });
      await onSuccess(user);
    } catch (err) {
      if (err instanceof ClientApiError) setServerError({ message: err.message, code: err.code });
      else setServerError({ message: 'Something went wrong. Please try again.', code: 'UNKNOWN' });
    } finally {
      setBusy(false);
    }
  }

  const input = (field: Field, label: string, props: { type?: string; autoComplete: string; placeholder?: string; inputMode?: 'email' | 'tel' }, hint?: string, optional = false) => (
    <div>
      <label htmlFor={id(field)} className="field-label">
        {label} {optional ? <span className="font-normal text-slate-400">(optional)</span> : null}
      </label>
      <input
        id={id(field)}
        name={field}
        value={form[field]}
        onChange={set(field)}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `${id(field)}-error` : hint ? `${id(field)}-hint` : undefined}
        className="field-input"
        {...props}
      />
      {errors[field] ? (
        <p id={`${id(field)}-error`} className="field-error">
          {errors[field]}
        </p>
      ) : hint ? (
        <p id={`${id(field)}-hint`} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Sign in or create an account">
        {(['login', 'register'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab}`}
            aria-selected={mode === tab}
            aria-controls={`${idPrefix}-panel`}
            onClick={() => switchMode(tab)}
            className={cn(
              'h-10 rounded-md text-sm font-semibold transition',
              mode === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {tab === 'login' ? 'Sign in' : 'Quick sign-up'}
          </button>
        ))}
      </div>

      <form
        id={`${idPrefix}-panel`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${mode}`}
        onSubmit={submit}
        noValidate
        className="mt-6 space-y-4"
      >
        {mode === 'register' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {input('firstName', 'First name', { autoComplete: 'given-name' })}
            {input('lastName', 'Last name', { autoComplete: 'family-name' })}
          </div>
        ) : null}
        {input('email', 'Email address', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
        {mode === 'register'
          ? input('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '0803 123 4567' }, 'For delivery updates.', true)
          : null}

        <div>
          <label htmlFor={id('password')} className="field-label">
            Password
          </label>
          <div className="relative">
            <input
              id={id('password')}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? `${id('password')}-error` : mode === 'register' ? `${id('password')}-hint` : undefined}
              className="field-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              <EyeIcon size={18} />
            </button>
          </div>
          {errors.password ? (
            <p id={`${id('password')}-error`} className="field-error">
              {errors.password}
            </p>
          ) : mode === 'register' ? (
            <p id={`${id('password')}-hint`} className="mt-1.5 text-sm text-slate-500">
              At least 8 characters, with a letter and a number.
            </p>
          ) : null}
        </div>

        {serverError ? (
          <div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            <AlertIcon size={18} className="mt-0.5 shrink-0" />
            <p>
              {serverError.message}{' '}
              {serverError.code === 'EMAIL_TAKEN' ? (
                <button type="button" onClick={() => switchMode('login')} className="font-semibold underline">
                  Sign in instead
                </button>
              ) : null}
              {serverError.code === 'INVALID_CREDENTIALS' ? (
                <button type="button" onClick={() => switchMode('register')} className="font-semibold underline">
                  New here? Create an account
                </button>
              ) : null}
            </p>
          </div>
        ) : null}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Spinner /> : null}
          {mode === 'login' ? labels.login : labels.register}
        </button>
      </form>
    </div>
  );
}
