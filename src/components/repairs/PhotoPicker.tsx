'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { MAX_REPAIR_PHOTO_BYTES } from '@/lib/repair-constants';
import { shrinkPhoto } from '@/lib/image-compress';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  max: number;
  id: string;
  label?: string;
}

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_TYPE: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
/** Originals may be big (phone cameras); they are shrunk before upload. Anything beyond this is refused outright. */
const MAX_ORIGINAL_BYTES = 40 * 1024 * 1024;

/** Some phones report an empty type; fall back to the file extension. */
function typeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TYPE[ext] ?? '';
}

/**
 * Photo picker: tap to choose from the gallery, take a photo with the camera (phones), or drag and drop.
 * Large photos are shrunk automatically, so customers are never told "too big".
 */
export function PhotoPicker({ files, onChange, max, id, label = 'Photos' }: Props) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const full = files.length >= max;

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  async function add(list: FileList | File[] | null) {
    if (!list || list.length === 0) return;
    setProblem(null);
    setBusy(true);
    const notes: string[] = [];
    try {
      const room = max - files.length;
      const incoming = Array.from(list);
      if (incoming.length > room) notes.push(`You can attach up to ${max} photos, so only the first ${Math.max(room, 0)} were added.`);
      const accepted: File[] = [];
      for (const original of incoming.slice(0, Math.max(room, 0))) {
        const type = typeOf(original);
        if (!OK_TYPES.includes(type)) {
          notes.push(`"${original.name}" is not a JPG, PNG or WebP photo.`);
          continue;
        }
        if (original.size > MAX_ORIGINAL_BYTES) {
          notes.push(`"${original.name}" is extremely large (over 40 MB). Choose a different photo.`);
          continue;
        }
        const typed = original.type ? original : new File([original], original.name, { type, lastModified: original.lastModified });
        const ready = await shrinkPhoto(typed, MAX_REPAIR_PHOTO_BYTES);
        if (ready.size > MAX_REPAIR_PHOTO_BYTES) {
          notes.push(`"${original.name}" could not be made small enough. Try another photo.`);
          continue;
        }
        const duplicate = [...files, ...accepted].some((f) => f.name === ready.name && f.size === ready.size);
        if (!duplicate) accepted.push(ready);
      }
      if (accepted.length) onChange([...files, ...accepted]);
    } finally {
      setBusy(false);
      if (notes.length) setProblem(notes.join(' '));
      if (gallery.current) gallery.current.value = '';
      if (camera.current) camera.current.value = '';
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!full) void add(event.dataTransfer.files);
  }

  return (
    <div>
      <p className="field-label">{label} <span className="font-normal text-slate-500">(JPG, PNG or WebP · up to {max} photos · large photos are shrunk for you)</span></p>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!full) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-4 text-center transition ${dragging ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-slate-50'} ${full ? 'opacity-60' : ''}`}
      >
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
          <label htmlFor={id} className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-within:ring-2 focus-within:ring-brand-300 ${full || busy ? 'pointer-events-none opacity-60' : ''}`}>
            Choose photos
            <input ref={gallery} id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={full || busy} onChange={(e) => void add(e.target.files)} className="sr-only" />
          </label>
          <label htmlFor={`${id}-camera`} className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-within:ring-2 focus-within:ring-brand-300 ${full || busy ? 'pointer-events-none opacity-60' : ''}`}>
            Take a photo
            <input ref={camera} id={`${id}-camera`} type="file" accept="image/*" capture="environment" disabled={full || busy} onChange={(e) => void add(e.target.files)} className="sr-only" />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">
          {busy ? 'Preparing your photos…' : full ? `Maximum of ${max} photos reached.` : `Or drag photos here · ${files.length} of ${max} added`}
        </p>
      </div>
      {problem ? <p role="alert" className="mt-2 text-sm text-rose-700">{problem}</p> : null}
      {files.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[index]} alt={`Selected photo ${index + 1}: ${file.name}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(files.filter((_, i) => i !== index))} aria-label={`Remove photo ${file.name}`} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-slate-900/80 text-sm font-bold text-white hover:bg-slate-900">×</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
