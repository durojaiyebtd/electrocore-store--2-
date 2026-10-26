'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Password field that is hidden by default, with an eye button to show or hide it. */
export function PasswordInput({ className, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...rest} type={visible ? 'text' : 'password'} className={`field-input pr-11 ${className ?? ''}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-brand-700 focus:outline-none focus-visible:text-brand-700"
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
}
