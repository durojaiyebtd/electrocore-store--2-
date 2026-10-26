'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Composer, Thread } from '@/components/repairs/Thread';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { REPAIR_CLOSED, REPAIR_STATUS_LABEL, type RepairStatusValue } from '@/lib/repair-constants';
import { formatWatDateTime } from '@/lib/repair-time';
import type { RepairPaymentOptionsDTO, RepairRequestDTO, RepairerDTO } from '@/types/repair';
import { repairTone } from './AdminRepairsView';
import { ErrorBanner, LoadingBlock, PageHeader, Panel, Pill, adminButton, adminInput, formatDateTime } from './ui';

interface Payload { request: RepairRequestDTO; payment: RepairPaymentOptionsDTO }

const NEXT_STATUSES: Array<{ value: Exclude<RepairStatusValue, 'SUBMITTED' | 'QUOTED' | 'NEGOTIATING' | 'ACCEPTED' | 'SCHEDULED'>; label: string }> = [
  { value: 'REVIEWING', label: 'Mark as being reviewed' },
  { value: 'IN_PROGRESS', label: 'Repair in progress' },
  { value: 'READY', label: 'Ready for collection' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Decline this request' },
  { value: 'CANCELLED', label: 'Cancel this request' },
];

export function AdminRepairDetailView({ id }: { id: string }) {
  const base = `/api/admin/repairs/${id}`;
  const [data, setData] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [repairers, setRepairers] = useState<RepairerDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerTurnaround, setOfferTurnaround] = useState('');
  const [statusChoice, setStatusChoice] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [notes, setNotes] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'BANK_TRANSFER' | 'OFFICE'>('OFFICE');

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<Payload>(base);
      setData(d);
      setNotes((n) => (n === '' ? d.request.adminNotes ?? '' : n));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load this request.');
    }
  }, [base]);

  useEffect(() => {
    void load();
    apiFetch<{ repairers: RepairerDTO[] }>('/api/admin/repairers').then((r) => setRepairers(r.repairers)).catch(() => setRepairers([]));
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  async function act(key: string, run: () => Promise<{ request: RepairRequestDTO }>): Promise<boolean> {
    setBusy(key);
    setError(null);
    try {
      const result = await run();
      setData((d) => (d ? { ...d, request: result.request } : d));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (loadError) return <div className="space-y-4"><ErrorBanner message={loadError} onRetry={load} /><Link href="/admin/repairs" className="text-sm font-semibold text-brand-700 underline">Back to repair requests</Link></div>;
  if (!data) return <LoadingBlock />;
  const { request: r, payment } = data;
  const closed = (REPAIR_CLOSED as readonly string[]).includes(r.status);
  const pendingCustomerOffer = r.offers.find((o) => o.status === 'PENDING' && o.by === 'CUSTOMER');
  const canQuote = ['SUBMITTED', 'REVIEWING', 'QUOTED', 'NEGOTIATING'].includes(r.status);
  const owed = r.agreedAmount != null ? r.agreedAmount - r.paidAmount : 0;

  function patch(body: Record<string, unknown>, key: string) {
    return act(key, () => apiFetch<{ request: RepairRequestDTO }>(base, { method: 'PATCH', body }));
  }

  async function sendOffer(e: FormEvent) {
    e.preventDefault();
    const amount = Number(offerAmount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) { setError('Enter the quotation amount in naira.'); return; }
    const ok = await act('offer', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/offers`, { method: 'POST', body: { amount, note: offerNote, turnaround: offerTurnaround } }));
    if (ok) { setOfferAmount(''); setOfferNote(''); setOfferTurnaround(''); }
  }

  async function changeStatus(e: FormEvent) {
    e.preventDefault();
    if (!statusChoice) return;
    const ok = await patch({ status: statusChoice, note: statusNote || undefined }, 'status');
    if (ok) { setStatusChoice(''); setStatusNote(''); }
  }

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    const amount = Number(payAmount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) { setError('Enter the amount received in naira.'); return; }
    const ok = await act('payment', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/payments`, { method: 'POST', body: { amount, method: payMethod } }));
    if (ok) setPayAmount('');
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Repair ${r.reference}`}
        description={`${r.brand} ${r.model} · ${r.faultSummary}`}
        actions={<><Pill tone={repairTone(r.status)}>{REPAIR_STATUS_LABEL[r.status]}</Pill><Link href="/admin/repairs" className={adminButton.secondary}>Back to list</Link></>}
      />
      {error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Customer and device">
            <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Customer</dt><dd className="font-medium">{r.name}</dd></div>
              <div><dt className="text-slate-500">Contact</dt><dd className="font-medium"><a className="text-brand-700 underline" href={`mailto:${r.email}`}>{r.email}</a> · <a className="text-brand-700 underline" href={`tel:${r.phone}`}>{r.phone}</a></dd></div>
              <div><dt className="text-slate-500">Device</dt><dd className="font-medium">{r.deviceType} · {r.brand} {r.model}{r.serialNumber ? ` · ${r.serialNumber}` : ''}</dd></div>
              <div><dt className="text-slate-500">Service / where</dt><dd className="font-medium">{r.serviceSlug} · {r.serviceMode === 'ONSITE' ? `On-site: ${r.address ?? ''}` : 'Workshop'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Fault description</dt><dd className="whitespace-pre-wrap font-medium">{r.faultDetails}</dd></div>
              <div><dt className="text-slate-500">Submitted</dt><dd className="font-medium">{formatDateTime(r.createdAt)}</dd></div>
            </dl>
            {r.images.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 px-5 pb-5 sm:grid-cols-6">
                {r.images.map((img) => (<li key={img.id} className="aspect-square overflow-hidden rounded-lg border border-slate-200"><a href={img.url} target="_blank" rel="noopener noreferrer">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={img.url} alt={img.fileName ?? 'Customer photo'} className="h-full w-full object-cover" loading="lazy" /></a></li>))}
              </ul>
            ) : <p className="px-5 pb-5 text-sm text-slate-500">The customer did not attach photos.</p>}
          </Panel>

          <Panel title="Conversation">
            <div className="space-y-4 p-5">
              <Thread messages={r.messages} viewer="ADMIN" />
              <Composer url={`${base}/messages`} disabled={closed} onUpdated={(req) => setData((d) => (d ? { ...d, request: req } : d))} />
            </div>
          </Panel>

          <Panel title="Timeline">
            <ol className="space-y-3 p-5">{[...r.events].reverse().map((e) => (<li key={e.id} className="text-sm"><p className="text-slate-900">{e.note}</p><p className="text-xs text-slate-500">{formatDateTime(e.createdAt)} · {e.actor}</p></li>))}</ol>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Quotation and negotiation">
            <div className="space-y-4 p-5 text-sm">
              {r.agreedAmount != null ? <p className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-900">Price agreed: {formatMoney(r.agreedAmount)}</p> : null}
              {r.offers.length ? <ol className="space-y-2">{r.offers.map((o) => (<li key={o.id} className="rounded-lg bg-slate-50 px-3 py-2"><p className="font-semibold">{o.by === 'ADMIN' ? 'Our quotation' : 'Customer offer'}: {formatMoney(o.amount)} <span className="ml-1 text-xs font-normal text-slate-500">{o.status.toLowerCase()}</span></p>{o.turnaround ? <p className="text-slate-600">{o.turnaround}</p> : null}{o.note ? <p className="text-slate-600">{o.note}</p> : null}</li>))}</ol> : <p className="text-slate-500">No offers yet.</p>}
              {pendingCustomerOffer && !closed ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold text-amber-900">Customer offered {formatMoney(pendingCustomerOffer.amount)}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy !== null} onClick={() => act('accept', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/offers/${pendingCustomerOffer.id}`, { method: 'POST', body: { action: 'accept' } }))} className={adminButton.primary}>{busy === 'accept' ? <Spinner /> : null} Accept</button>
                    <button type="button" disabled={busy !== null} onClick={() => act('reject', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/offers/${pendingCustomerOffer.id}`, { method: 'POST', body: { action: 'reject' } }))} className={adminButton.secondary}>Decline</button>
                  </div>
                </div>
              ) : null}
              {canQuote ? (
                <form onSubmit={sendOffer} className="space-y-2">
                  <p className="font-semibold text-slate-900">{r.offers.length ? 'Send a new quotation' : 'Send a quotation'}</p>
                  <label htmlFor="offer-amount" className="sr-only">Amount in naira</label>
                  <input id="offer-amount" className={adminInput} inputMode="decimal" placeholder="Amount (₦)" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} />
                  <label htmlFor="offer-turn" className="sr-only">Estimated turnaround</label>
                  <input id="offer-turn" className={adminInput} placeholder="Turnaround, e.g. 3 working days (optional)" value={offerTurnaround} onChange={(e) => setOfferTurnaround(e.target.value)} maxLength={120} />
                  <label htmlFor="offer-note" className="sr-only">What the price covers</label>
                  <textarea id="offer-note" className={`${adminInput} h-20 py-2`} placeholder="What the price covers (optional)" value={offerNote} onChange={(e) => setOfferNote(e.target.value)} maxLength={500} />
                  <button type="submit" disabled={busy !== null} className={adminButton.primary}>{busy === 'offer' ? <Spinner /> : null} Send to customer</button>
                </form>
              ) : null}
            </div>
          </Panel>

          <Panel title="Status and assignment">
            <div className="space-y-4 p-5 text-sm">
              <div>
                <label htmlFor="assign" className="mb-1 block font-medium text-slate-700">Assigned repairer</label>
                <select id="assign" className={adminInput} value={r.repairerId ?? ''} disabled={busy !== null} onChange={(e) => patch({ repairerId: e.target.value || null }, 'assign')}>
                  <option value="">Not assigned</option>
                  {repairers.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (inactive)'}</option>)}
                </select>
              </div>
              {!closed ? (
                <form onSubmit={changeStatus} className="space-y-2">
                  <label htmlFor="status" className="block font-medium text-slate-700">Change status</label>
                  <select id="status" className={adminInput} value={statusChoice} onChange={(e) => setStatusChoice(e.target.value)}>
                    <option value="">Choose…</option>
                    {NEXT_STATUSES.filter((s) => s.value !== r.status).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <label htmlFor="status-note" className="sr-only">Note for the customer</label>
                  <input id="status-note" className={adminInput} placeholder="Note shown to the customer (optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={500} />
                  <button type="submit" disabled={!statusChoice || busy !== null} className={adminButton.secondary}>{busy === 'status' ? <Spinner /> : null} Update status</button>
                </form>
              ) : null}
              <div>
                <label htmlFor="notes" className="mb-1 block font-medium text-slate-700">Private notes (customer cannot see)</label>
                <textarea id="notes" className={`${adminInput} h-24 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
                <button type="button" disabled={busy !== null} onClick={() => patch({ adminNotes: notes }, 'notes')} className={`${adminButton.secondary} mt-2`}>{busy === 'notes' ? <Spinner /> : null} Save notes</button>
              </div>
            </div>
          </Panel>

          <Panel title="Appointments">
            <div className="space-y-3 p-5 text-sm">
              {r.bookings.length === 0 ? <p className="text-slate-500">No appointment booked.</p> : r.bookings.map((b) => (
                <div key={b.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="font-semibold">{formatWatDateTime(b.startsAt)}</p>
                  <p className="text-slate-600">{b.repairerName} · {b.mode === 'ONSITE' ? `On-site: ${b.address ?? ''}` : (r.workshopAddress ? `Office: ${r.workshopAddress}` : 'Office')} · {b.reference}</p>
                  <p className="mt-1"><Pill tone={b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'green' : b.status === 'PENDING' ? 'amber' : 'slate'}>{b.status.toLowerCase()}</Pill></p>
                  {b.status === 'PENDING' || b.status === 'CONFIRMED' ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {b.status === 'PENDING' ? <button type="button" disabled={busy !== null} onClick={() => act(`bk-${b.id}`, () => apiFetch<{ request: RepairRequestDTO }>(`${base}/bookings/${b.id}`, { method: 'PATCH', body: { status: 'CONFIRMED' } }))} className={adminButton.primary}>Confirm</button> : null}
                      {b.status === 'CONFIRMED' ? <button type="button" disabled={busy !== null} onClick={() => act(`bk-${b.id}`, () => apiFetch<{ request: RepairRequestDTO }>(`${base}/bookings/${b.id}`, { method: 'PATCH', body: { status: 'COMPLETED' } }))} className={adminButton.secondary}>Mark completed</button> : null}
                      <button type="button" disabled={busy !== null} onClick={() => { const reason = window.prompt('Reason for cancelling (the customer will see it):') ?? null; if (reason !== null) void act(`bk-${b.id}`, () => apiFetch<{ request: RepairRequestDTO }>(`${base}/bookings/${b.id}`, { method: 'PATCH', body: { status: 'CANCELLED', reason } })); }} className={adminButton.danger}>Cancel</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Payment">
            <div className="space-y-3 p-5 text-sm">
              {r.agreedAmount == null ? <p className="text-slate-500">Agree a price first.</p> : (<>
                <p>Agreed {formatMoney(r.agreedAmount)} · Paid {formatMoney(r.paidAmount)} · <strong>Owed {formatMoney(Math.max(0, owed))}</strong></p>
                <p className="text-slate-500">Customer’s chosen method: {r.paymentMethod ? r.paymentMethod.replace('_', ' ').toLowerCase() : 'not chosen yet'}. Online payments are recorded automatically. Bank/office: {payment.bank ? 'bank details are shown to customers' : 'bank transfer is not configured (set REPAIR_BANK_* variables)'}.</p>
                {owed > 0 ? (
                  <form onSubmit={recordPayment} className="space-y-2">
                    <p className="font-semibold text-slate-900">Record money received</p>
                    <input aria-label="Amount received in naira" className={adminInput} inputMode="decimal" placeholder="Amount (₦)" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                    <select aria-label="How it was paid" className={adminInput} value={payMethod} onChange={(e) => setPayMethod(e.target.value as 'BANK_TRANSFER' | 'OFFICE')}><option value="OFFICE">Paid at the office</option><option value="BANK_TRANSFER">Bank transfer</option></select>
                    <button type="submit" disabled={busy !== null} className={adminButton.primary}>{busy === 'payment' ? <Spinner /> : null} Record payment</button>
                  </form>
                ) : <p className="font-semibold text-emerald-700">Fully paid.</p>}
              </>)}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
