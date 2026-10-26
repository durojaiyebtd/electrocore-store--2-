'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { WEEKDAYS, minutesToClock } from '@/lib/repair-constants';
import { todayInWat } from '@/lib/repair-time';
import type { OfficeDTO, RepairerDTO, SlotDTO } from '@/types/repair';

export interface BookingChoice { repairerId: string; date: string; time: string }

interface Props {
  mode: 'WORKSHOP' | 'ONSITE';
  value: BookingChoice;
  onChange: (value: BookingChoice) => void;
  idPrefix: string;
}

/** Lists repairers (specialities, areas, working days) and lets the customer pick a date and a free time slot. */
export function BookingPicker({ mode, value, onChange, idPrefix }: Props) {
  const [repairers, setRepairers] = useState<RepairerDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [office, setOffice] = useState<OfficeDTO | null>(null);
  const [slots, setSlots] = useState<SlotDTO[] | null>(null);
  const [slotsBusy, setSlotsBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ repairers: RepairerDTO[]; office?: OfficeDTO }>('/api/repairers')
      .then((r) => { setRepairers(r.repairers); setOffice(r.office ?? null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load repairers.'));
  }, []);

  useEffect(() => {
    if (!value.repairerId || !value.date) {
      setSlots(null);
      return;
    }
    let cancelled = false;
    setSlotsBusy(true);
    apiFetch<{ slots: SlotDTO[] }>(`/api/repairers/${value.repairerId}/slots?date=${value.date}`)
      .then((r) => !cancelled && setSlots(r.slots))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load times.'))
      .finally(() => !cancelled && setSlotsBusy(false));
    return () => {
      cancelled = true;
    };
  }, [value.repairerId, value.date]);

  if (error) return <p role="alert" className="text-sm text-rose-700">{error}</p>;
  if (!repairers) return <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Loading repairers…</p>;
  if (repairers.length === 0) return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No repairers are open for booking right now. Submit your request without an appointment and we will arrange one with you.</p>;

  const visible = mode === 'ONSITE' ? repairers.filter((r) => r.offersOnsite) : repairers;

  return (
    <div className="space-y-4">
      {mode === 'ONSITE' && visible.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">None of our repairers offers on-site visits at the moment. Choose the workshop option instead.</p>
      ) : null}
      {mode === 'WORKSHOP' ? (
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-slate-800">
          <p className="font-semibold text-brand-800">Bring your device to our office</p>
          <p>{office?.address ?? 'We will send you the office address when your appointment is confirmed.'}</p>
          {office?.hours ? <p className="text-slate-600">Open {office.hours}</p> : null}
        </div>
      ) : null}
      <fieldset>
        <legend className="field-label">Choose a repairer</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((r) => {
            const selected = value.repairerId === r.id;
            return (
              <label key={r.id} className={`cursor-pointer rounded-xl border p-4 text-sm transition ${selected ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 bg-white hover:border-brand-300'}`}>
                <input type="radio" name={`${idPrefix}-repairer`} className="sr-only" checked={selected} onChange={() => onChange({ repairerId: r.id, date: value.date, time: '' })} />
                <p className="font-semibold text-slate-900">{r.name}</p>
                {r.title ? <p className="text-slate-500">{r.title}</p> : null}
                {r.bio ? <p className="mt-1 text-slate-600">{r.bio}</p> : null}
                {r.specialities.length ? <p className="mt-2 text-slate-700"><span className="font-medium">Specialities:</span> {r.specialities.join(', ')}</p> : null}
                {r.serviceAreas.length ? <p className="text-slate-700"><span className="font-medium">Areas:</span> {r.serviceAreas.join(', ')}</p> : null}
                <p className="text-slate-700"><span className="font-medium">Available:</span> {r.workDays.map((d) => WEEKDAYS[d].slice(0, 3)).join(', ') || 'No days set'}, {minutesToClock(r.startMinutes)} – {minutesToClock(r.endMinutes)}</p>
                <p className="text-slate-700"><span className="font-medium">On-site visits:</span> {r.offersOnsite ? 'Yes' : 'Office visits only'}</p>
              </label>
            );
          })}
        </div>
      </fieldset>

      {value.repairerId ? (
        <div>
          <label htmlFor={`${idPrefix}-date`} className="field-label">Choose a date</label>
          <input id={`${idPrefix}-date`} type="date" min={todayInWat()} value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value, time: '' })} className="field-input max-w-xs" />
        </div>
      ) : null}

      {value.repairerId && value.date ? (
        <fieldset>
          <legend className="field-label">Choose a time (West Africa Time)</legend>
          {slotsBusy ? <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Checking availability…</p>
            : !slots || slots.length === 0 ? <p className="text-sm text-slate-600">This repairer does not work on that date. Try another day.</p>
            : slots.every((s) => !s.available) ? <p className="text-sm text-slate-600">Every time on that day is taken. Try another day.</p>
            : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((s) => (
                  <button key={s.time} type="button" disabled={!s.available} aria-pressed={value.time === s.time} onClick={() => onChange({ ...value, time: s.time })} className={`h-11 rounded-lg border text-sm font-semibold transition ${value.time === s.time ? 'border-brand-600 bg-brand-600 text-white' : s.available ? 'border-slate-300 bg-white text-slate-800 hover:border-brand-500' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'}`}>{s.label}</button>
                ))}
              </div>
            )}
        </fieldset>
      ) : null}
    </div>
  );
}
