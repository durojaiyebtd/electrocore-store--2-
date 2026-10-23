'use client';

/** "Upload photo" button: picks a file, uploads it, and hands back the new image URL. */
import { useRef, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { uploadImage } from '@/lib/upload-client';
import { adminButton } from './ui';

export function PhotoUpload({ onUploaded, label = 'Upload photo' }: { onUploaded: (url: string) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onUploaded(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label={label} onChange={(e) => void onChange(e.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={adminButton.secondary}>
        {busy ? <Spinner /> : null}
        {busy ? 'Uploading…' : label}
      </button>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
