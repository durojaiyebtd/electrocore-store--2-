'use client';

import { useState, type FormEvent } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { WEEKDAYS, minutesToClock } from '@/lib/repair-constants';
import type { RepairerDTO } from '@/types/repair';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Panel, Pill, adminButton, adminInput, useAdminQuery } from './ui';

interface FormState {
  id: string | null;
  name: string; title: string; bio: string; phone: string;
  specialities: string; serviceAreas: string; offersOnsite: boolean;
  workDays: number[]; start: string; end: string; slotMinutes: number; active: boolean;
}

const EMPTY: FormState = { id: null, name: '', title: '', bio: '', phone: '', specialities: '', serviceAreas: '', offersOnsite: false, workDays: [1, 2, 3, 4, 5], start: '09:00', end: '17:00', slotMinutes: 60, active: true };

function toClock(minutes: number): string { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
function toMinutes(clock: string): number { const [h, m] = clock.split(':').map(Number); return h * 60 + m; }
const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

export function AdminRepairersView() {
  const { data, error, loading, reload } = useAdminQuery<{ repairers: RepairerDTO[] }>('/api/admin/repairers');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function edit(r: RepairerDTO) {
    setFormError(null);
    setForm({ id: r.id, name: r.name, title: r.title ?? '', bio: r.bio ?? '', phone: r.phone ?? '', specialities: r.specialities.join(', '), serviceAreas: r.serviceAreas.join(', '), offersOnsite: r.offersOnsite, workDays: r.workDays, start: toClock(r.startMinutes), end: toClock(r.endMinutes), slotMinutes: r.slotMinutes, active: r.active });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError(null);
    const body = { name: form.name, title: form.title, bio: form.bio, phone: form.phone, specialities: splitList(form.specialities), serviceAreas: splitList(form.serviceAreas), offersOnsite: form.offersOnsite, workDays: form.workDays, startMinutes: toMinutes(form.start), endMinutes: toMinutes(form.end), slotMinutes: form.slotMinutes, active: form.active };
    try {
      await apiFetch(form.id ? `/api/admin/repairers/${form.id}` : '/api/admin/repairers', { method: form.id ? 'PUT' : 'POST', body });
      setMessage(form.id ? 'Repairer updated.' : 'Repairer added. Customers can now book them.');
      setForm(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: RepairerDTO) {
    if (!window.confirm(`Remove ${r.name}? If they have bookings or assigned repairs they are made inactive instead, so history is kept.`)) return;
    try {
      const result = await apiFetch<{ deleted: boolean }>(`/api/admin/repairers/${r.id}`, { method: 'DELETE' });
      setMessage(result.deleted ? `${r.name} was deleted.` : `${r.name} has history, so they were made inactive instead of deleted.`);
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not remove.');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Repairers" description="The people customers can book. Set their specialities, service areas, working days and hours (West Africa Time)." actions={<button type="button" onClick={() => { setFormError(null); setForm({ ...EMPTY }); }} className={adminButton.primary}>Add a repairer</button>} />
      {message ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p> : null}

      {form ? (
        <Panel title={form.id ? `Edit ${form.name || 'repairer'}` : 'New repairer'}>
          <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
            <div><label htmlFor="rp-name" className="mb-1 block text-sm font-medium">Name</label><input id="rp-name" className={adminInput} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label htmlFor="rp-title" className="mb-1 block text-sm font-medium">Job title</label><input id="rp-title" className={adminInput} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="sm:col-span-2"><label htmlFor="rp-bio" className="mb-1 block text-sm font-medium">Short description shown to customers</label><textarea id="rp-bio" className={`${adminInput} h-20 py-2`} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={600} /></div>
            <div><label htmlFor="rp-phone" className="mb-1 block text-sm font-medium">Phone (private, for your team)</label><input id="rp-phone" className={adminInput} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label htmlFor="rp-spec" className="mb-1 block text-sm font-medium">Specialities (comma separated)</label><input id="rp-spec" className={adminInput} placeholder="Phone screens, Laptop boards" value={form.specialities} onChange={(e) => setForm({ ...form, specialities: e.target.value })} /></div>
            <div className="sm:col-span-2"><label htmlFor="rp-areas" className="mb-1 block text-sm font-medium">Service areas (comma separated)</label><input id="rp-areas" className={adminInput} placeholder="Workshop, Ikeja, Lekki" value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} /></div>
            <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Working days</legend><div className="flex flex-wrap gap-3">{WEEKDAYS.map((d, i) => (<label key={d} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.workDays.includes(i)} onChange={(e) => setForm({ ...form, workDays: e.target.checked ? [...form.workDays, i] : form.workDays.filter((x) => x !== i) })} />{d}</label>))}</div></fieldset>
            <div><label htmlFor="rp-start" className="mb-1 block text-sm font-medium">Starts</label><input id="rp-start" type="time" className={adminInput} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div><label htmlFor="rp-end" className="mb-1 block text-sm font-medium">Finishes</label><input id="rp-end" type="time" className={adminInput} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
            <div><label htmlFor="rp-slot" className="mb-1 block text-sm font-medium">Appointment length</label><select id="rp-slot" className={adminInput} value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: Number(e.target.value) })}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.offersOnsite} onChange={(e) => setForm({ ...form, offersOnsite: e.target.checked })} /> Offers on-site (home/office) visits</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active (customers can book)</label>
            </div>
            {formError ? <div className="sm:col-span-2"><ErrorBanner message={formError} /></div> : null}
            <div className="flex gap-3 sm:col-span-2"><button type="submit" disabled={saving} className={adminButton.primary}>{saving ? <Spinner /> : null} Save repairer</button><button type="button" onClick={() => setForm(null)} className={adminButton.secondary}>Cancel</button></div>
          </form>
        </Panel>
      ) : null}

      <Panel>
        {error ? <div className="p-4"><ErrorBanner message={error} onRetry={reload} /></div>
          : loading && !data ? <LoadingBlock />
          : !data || data.repairers.length === 0 ? <EmptyState title="No repairers yet" body="Add your first repairer so customers can book appointments. Until then, the booking page tells customers none are available." />
          : <ul className="divide-y divide-slate-100">{data.repairers.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
                <div className="min-w-0"><p className="font-semibold text-slate-900">{r.name} {r.active ? <Pill tone="green">Active</Pill> : <Pill tone="slate">Inactive</Pill>} {r.offersOnsite ? <Pill tone="blue">On-site</Pill> : null}</p>
                  {r.title ? <p className="text-slate-500">{r.title}</p> : null}
                  <p className="text-slate-600">{r.workDays.map((d) => WEEKDAYS[d].slice(0, 3)).join(', ') || 'No working days'} · {minutesToClock(r.startMinutes)}–{minutesToClock(r.endMinutes)} · {r.slotMinutes}-minute slots</p>
                  {r.specialities.length ? <p className="text-slate-600">Specialities: {r.specialities.join(', ')}</p> : null}
                  {r.serviceAreas.length ? <p className="text-slate-600">Areas: {r.serviceAreas.join(', ')}</p> : null}</div>
                <div className="flex gap-2"><button type="button" onClick={() => edit(r)} className={adminButton.secondary}>Edit</button><button type="button" onClick={() => remove(r)} className={adminButton.danger}>Remove</button></div>
              </li>))}</ul>}
      </Panel>
    </div>
  );
}
