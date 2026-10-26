'use client';

import { useState, type FormEvent } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiUpload } from '@/lib/api-client';
import { MAX_MESSAGE_PHOTOS } from '@/lib/repair-constants';
import type { RepairMessageDTO, RepairRequestDTO } from '@/types/repair';
import { PhotoPicker } from './PhotoPicker';

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(iso));
}

/** The conversation between customer and store, used on both the customer and admin screens. */
export function Thread({ messages, viewer }: { messages: RepairMessageDTO[]; viewer: 'CUSTOMER' | 'ADMIN' }) {
  if (messages.length === 0) return <p className="py-6 text-center text-sm text-slate-500">No messages yet. Use the box below to start the conversation.</p>;
  return (
    <ol className="space-y-3" aria-label="Conversation">
      {messages.map((m) => {
        const mine = m.sender === viewer;
        return (
          <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[75%] ${mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
              <p className={`text-xs font-semibold ${mine ? 'text-white/80' : 'text-slate-500'}`}>{m.authorName} · {when(m.createdAt)}</p>
              {m.body ? <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p> : null}
              {m.images.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.images.map((img) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-white/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.fileName ?? 'Attached photo'} className="h-full w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Composer({ url, onUpdated, disabled }: { url: string; onUpdated: (request: RepairRequestDTO) => void; disabled?: boolean }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() && files.length === 0) {
      setError('Write a message or attach a photo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('body', body);
      files.forEach((f) => form.append('photos', f));
      const result = await apiUpload<{ request: RepairRequestDTO }>(url, form);
      onUpdated(result.request);
      setBody('');
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message.');
    } finally {
      setBusy(false);
    }
  }

  if (disabled) return <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">This request is closed, so new messages cannot be sent.</p>;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <label htmlFor={`msg-${url}`} className="field-label">Message</label>
        <textarea id={`msg-${url}`} rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} className="field-input h-auto py-2" placeholder="Describe the fault, ask a question or reply to the offer…" />
      </div>
      <PhotoPicker id={`msg-photos-${url}`} files={files} onChange={setFiles} max={MAX_MESSAGE_PHOTOS} label="Add photos (optional)" />
      {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">{busy ? <Spinner /> : null} Send message</button>
    </form>
  );
}
