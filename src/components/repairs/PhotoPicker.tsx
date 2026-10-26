'use client';

import { useEffect, useRef, useState } from 'react';
import { MAX_REPAIR_PHOTO_BYTES } from '@/lib/repair-constants';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  max: number;
  id: string;
  label?: string;
}

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Multi-photo picker with thumbnails. Checks type and size in the browser; the server checks again. */
export function PhotoPicker({ files, onChange, max, id, label = 'Photos' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function add(list: FileList | null) {
    if (!list) return;
    setProblem(null);
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (!OK_TYPES.includes(file.type)) {
        setProblem(`"${file.name}" is not a JPG, PNG or WebP photo.`);
        continue;
      }
      if (file.size > MAX_REPAIR_PHOTO_BYTES) {
        setProblem(`"${file.name}" is larger than 3 MB. Resize it and try again.`);
        continue;
      }
      accepted.push(file);
    }
    const merged = [...files, ...accepted];
    if (merged.length > max) setProblem(`You can attach up to ${max} photos.`);
    onChange(merged.slice(0, max));
    if (input.current) input.current.value = '';
  }

  return (
    <div>
      <label htmlFor={id} className="field-label">{label} <span className="font-normal text-slate-500">(JPG, PNG or WebP, up to 3 MB each, max {max})</span></label>
      <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => add(e.target.files)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100" />
      {problem ? <p role="alert" className="mt-2 text-sm text-rose-700">{problem}</p> : null}
      {files.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[index]} alt={`Selected photo ${index + 1}: ${file.name}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(files.filter((_, i) => i !== index))} aria-label={`Remove photo ${file.name}`} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-900/80 text-xs font-bold text-white hover:bg-slate-900">×</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
