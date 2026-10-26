'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { ClientApiError, apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { BOOKING_STATUS_LABEL, REPAIR_CLOSED, REPAIR_STATUS_LABEL } from '@/lib/repair-constants';
import { formatWatDateTime } from '@/lib/repair-time';
import type { RepairPaymentOptionsDTO, RepairRequestDTO } from '@/types/repair';
import { BookingPicker, type BookingChoice } from './BookingPicker';
import { Composer, Thread } from './Thread';

interface Payload { request: RepairRequestDTO; payment: RepairPaymentOptionsDTO }

function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={`${id ?? title}-h`} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id={`${id ?? title}-h`} className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function RepairTrackView({ code }: { code: string }) {
  const search = useSearchParams();
  const base = `/api/repairs/t/${code}`;
  const [data, setData] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(search.get('notice'));
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [counter, setCounter] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [choice, setChoice] = useState<BookingChoice>({ repairerId: '', date: '', time: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [payInfo, setPayInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Payload>(base));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your request.');
    }
  }, [base]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  async function act<T extends { request?: RepairRequestDTO }>(key: string, run: () => Promise<T>): Promise<T | null> {
    setBusy(key);
    setActionError(null);
    try {
      const result = await run();
      if (result.request) setData((d) => (d ? { ...d, request: result.request as RepairRequestDTO } : d));
      return result;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'That did not work. Please try again.');
      if (e instanceof ClientApiError && e.status === 409) void load();
      return null;
    } finally {
      setBusy(null);
    }
  }

  if (loadError) return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900" role="alert">
      <p className="font-semibold">{loadError}</p>
      <p className="mt-1 text-sm">Check that you opened the full link from your email or confirmation page, or <Link className="underline" href="/repairs/track">look it up with your reference and email</Link>.</p>
    </div>
  );
  if (!data) return <p className="flex items-center gap-3 py-16 text-slate-500"><Spinner className="h-5 w-5" /> Loading your repair request…</p>;

  const { request: r, payment } = data;
  const closed = (REPAIR_CLOSED as readonly string[]).includes(r.status);
  const pendingAdminOffer = r.offers.find((o) => o.status === 'PENDING' && o.by === 'ADMIN');
  const pendingMyOffer = r.offers.find((o) => o.status === 'PENDING' && o.by === 'CUSTOMER');
  const canNegotiate = ['SUBMITTED', 'REVIEWING', 'QUOTED', 'NEGOTIATING'].includes(r.status);
  const owed = r.agreedAmount != null ? Math.max(0, r.agreedAmount - r.paidAmount) : 0;
  const activeBooking = r.bookings.find((b) => b.status === 'PENDING' || b.status === 'CONFIRMED');

  async function sendCounter(e: FormEvent) {
    e.preventDefault();
    const amount = Number(counter.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) { setActionError('Enter the amount in naira, for example 25000.'); return; }
    const res = await act('counter', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/offers`, { method: 'POST', body: { amount, note: counterNote } }));
    if (res) { setCounter(''); setCounterNote(''); }
  }

  async function pay(method: 'PAYSTACK' | 'BANK_TRANSFER' | 'OFFICE') {
    const res = await act('pay', () => apiFetch<{ request: RepairRequestDTO; authorizationUrl: string | null }>(`${base}/pay`, { method: 'POST', body: { method } }));
    if (!res) return;
    if (res.authorizationUrl) { window.location.assign(res.authorizationUrl); return; }
    setPayInfo(method === 'BANK_TRANSFER' ? 'Transfer the amount using the bank details below, then message us the receipt. We will record your payment once it arrives.' : 'Pay at our office when you drop off or collect the device. We will record your payment then.');
  }

  async function book() {
    if (!choice.repairerId || !choice.date || !choice.time) { setActionError('Choose a repairer, a date and a time.'); return; }
    const res = await act('book', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/bookings`, { method: 'POST', body: { ...choice, mode: r.serviceMode, address: r.address ?? '' } }));
    if (res) { setChoice({ repairerId: '', date: '', time: '' }); setNotice(null); }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Repair request</p>
            <h1 className="font-mono text-2xl font-semibold text-slate-900">{r.reference}</h1>
            <p className="mt-1 text-slate-700">{r.brand} {r.model} · {r.faultSummary}</p>
          </div>
          <span className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">{REPAIR_STATUS_LABEL[r.status]}</span>
        </div>
        {search.get('new') === '1' ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Thank you. Your request was sent. <strong>Save this page’s link</strong>: it is the private link to your request. You can also find it later with your reference and email on the “Track a repair” page.</p> : null}
        {notice ? <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p> : null}
      </header>

      {actionError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</p> : null}

      <Card title="Price and negotiation" id="negotiation">
        {r.agreedAmount != null ? (
          <p className="text-slate-800">Agreed price: <strong className="text-lg">{formatMoney(r.agreedAmount)}</strong></p>
        ) : r.offers.length === 0 ? (
          <p className="text-sm text-slate-600">We are reviewing your photos and description. We will send a written quotation here. You can also suggest a price yourself below.</p>
        ) : null}

        {r.offers.length > 0 ? (
          <ol className="mt-3 space-y-2" aria-label="Offers so far">
            {r.offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                <span><strong>{o.by === 'ADMIN' ? 'Our quotation' : 'Your offer'}: {formatMoney(o.amount)}</strong>{o.turnaround ? ` · ${o.turnaround}` : ''}{o.note ? <span className="block text-slate-600">{o.note}</span> : null}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : o.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{o.status === 'PENDING' ? 'Waiting' : o.status === 'SUPERSEDED' ? 'Replaced' : o.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {pendingAdminOffer && !closed ? (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="font-semibold text-slate-900">We quoted {formatMoney(pendingAdminOffer.amount)}.</p>
            <p className="text-sm text-slate-700">This is a price for this repair only. Accept it, decline it, or suggest your own price below.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" disabled={busy !== null} onClick={() => act('accept', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/offers/${pendingAdminOffer.id}`, { method: 'POST', body: { action: 'accept' } }))} className="btn-primary h-11">{busy === 'accept' ? <Spinner /> : null} Accept {formatMoney(pendingAdminOffer.amount)}</button>
              <button type="button" disabled={busy !== null} onClick={() => act('reject', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/offers/${pendingAdminOffer.id}`, { method: 'POST', body: { action: 'reject' } }))} className="btn-secondary h-11">Decline</button>
            </div>
          </div>
        ) : null}
        {pendingMyOffer && !closed ? <p className="mt-3 text-sm text-slate-600">You offered {formatMoney(pendingMyOffer.amount)}. We will reply here soon.</p> : null}

        {canNegotiate ? (
          <form onSubmit={sendCounter} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="counter-amount" className="field-label">Your price (₦)</label>
              <input id="counter-amount" inputMode="decimal" value={counter} onChange={(e) => setCounter(e.target.value)} className="field-input" placeholder="e.g. 25000" />
            </div>
            <div>
              <label htmlFor="counter-note" className="field-label">Note <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="counter-note" value={counterNote} onChange={(e) => setCounterNote(e.target.value)} maxLength={500} className="field-input" />
            </div>
            <button type="submit" disabled={busy !== null} className="btn-secondary">{busy === 'counter' ? <Spinner /> : null} Send my price</button>
          </form>
        ) : null}
      </Card>

      {r.agreedAmount != null && !closed ? (
        <Card title="Payment" id="payment">
          <p className="text-slate-800">Agreed: <strong>{formatMoney(r.agreedAmount)}</strong> · Paid: <strong>{formatMoney(r.paidAmount)}</strong> · Still to pay: <strong>{formatMoney(owed)}</strong></p>
          {owed > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-600">Choose how you would like to pay. {r.paymentMethod ? `You chose: ${r.paymentMethod === 'PAYSTACK' ? 'online' : r.paymentMethod === 'BANK_TRANSFER' ? 'bank transfer' : 'pay at our office'}.` : ''}</p>
              <div className="flex flex-wrap gap-3">
                {payment.paystack ? <button type="button" disabled={busy !== null} onClick={() => pay('PAYSTACK')} className="btn-primary h-11">{busy === 'pay' ? <Spinner /> : null} Pay online now</button> : null}
                {payment.bank ? <button type="button" disabled={busy !== null} onClick={() => pay('BANK_TRANSFER')} className="btn-secondary h-11">Pay by bank transfer</button> : null}
                <button type="button" disabled={busy !== null} onClick={() => pay('OFFICE')} className="btn-secondary h-11">Pay at our office</button>
              </div>
              {payInfo ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{payInfo}</p> : null}
              {r.paymentMethod === 'BANK_TRANSFER' && payment.bank ? (
                <dl className="rounded-lg bg-slate-50 p-4 text-sm"><dt className="font-medium text-slate-500">Bank</dt><dd className="mb-2 font-semibold">{payment.bank.bankName}</dd><dt className="font-medium text-slate-500">Account name</dt><dd className="mb-2 font-semibold">{payment.bank.accountName}</dd><dt className="font-medium text-slate-500">Account number</dt><dd className="font-mono font-semibold">{payment.bank.accountNumber}</dd><dd className="mt-2 text-slate-600">Use {r.reference} as the transfer reference.</dd></dl>
              ) : null}
              {r.paymentMethod === 'OFFICE' ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{payment.office.address ? <>Our office: <strong>{payment.office.address}</strong>. </> : <>Our address is on the <Link className="underline" href="/contact">contact page</Link>. </>}Hours: {payment.office.hours}.</p> : null}
              {!payment.paystack || !payment.bank ? <p className="text-xs text-slate-500">{!payment.paystack ? 'Online payment is not available right now. ' : ''}{!payment.bank ? 'Bank transfer is not available right now.' : ''}</p> : null}
            </div>
          ) : <p className="mt-2 text-sm text-emerald-700">Fully paid. Thank you.</p>}
        </Card>
      ) : null}

      <Card title="Appointment" id="appointment">
        {r.bookings.length > 0 ? (
          <ul className="space-y-2">
            {r.bookings.map((b) => (
              <li key={b.id} className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-900">{formatWatDateTime(b.startsAt)} · {b.repairerName}</p>
                <p className="text-slate-600">{b.mode === 'ONSITE' ? `On-site visit${b.address ? `: ${b.address}` : ''}` : 'At our workshop'} · Ref {b.reference}</p>
                <p className="mt-1"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : b.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{BOOKING_STATUS_LABEL[b.status]}</span>{b.cancelReason ? <span className="ml-2 text-slate-500">{b.cancelReason}</span> : null}</p>
                {b.status === 'PENDING' || b.status === 'CONFIRMED' ? <button type="button" disabled={busy !== null} onClick={() => act('cancel-booking', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/bookings/${b.id}/cancel`, { method: 'POST', body: { reason: 'Cancelled by customer' } }))} className="mt-2 text-sm font-semibold text-rose-700 underline">Cancel this appointment</button> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-600">No appointment yet.</p>}
        {!activeBooking && !closed ? (
          <div className="mt-4 space-y-4">
            <h3 className="font-semibold text-slate-900">Book a repairer</h3>
            <BookingPicker idPrefix="trk" mode={r.serviceMode} value={choice} onChange={setChoice} />
            <button type="button" disabled={busy !== null} onClick={book} className="btn-primary">{busy === 'book' ? <Spinner /> : null} Request this appointment</button>
          </div>
        ) : null}
      </Card>

      <Card title="Messages" id="messages">
        <Thread messages={r.messages} viewer="CUSTOMER" />
        <div className="mt-4"><Composer url={`${base}/messages`} disabled={closed} onUpdated={(req) => setData((d) => (d ? { ...d, request: req } : d))} /></div>
      </Card>

      <Card title="Your request" id="details">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Device</dt><dd className="font-medium">{r.deviceType} · {r.brand} {r.model}{r.serialNumber ? ` · ${r.serialNumber}` : ''}</dd></div>
          <div><dt className="text-slate-500">Contact</dt><dd className="font-medium">{r.name} · {r.phone} · {r.email}</dd></div>
          <div><dt className="text-slate-500">Where</dt><dd className="font-medium">{r.serviceMode === 'ONSITE' ? `On-site: ${r.address ?? ''}` : 'At our workshop'}</dd></div>
          <div><dt className="text-slate-500">Repairer</dt><dd className="font-medium">{r.repairerName ?? 'Not assigned yet'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-slate-500">Fault</dt><dd className="whitespace-pre-wrap font-medium">{r.faultDetails}</dd></div>
        </dl>
        {r.images.length > 0 ? (
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {r.images.map((img) => (
              <li key={img.id} className="aspect-square overflow-hidden rounded-lg border border-slate-200">
                <a href={img.url} target="_blank" rel="noopener noreferrer">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={img.url} alt={img.fileName ?? 'Photo of the damaged device'} className="h-full w-full object-cover" loading="lazy" /></a>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card title="Progress" id="progress">
        <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
          {[...r.events].reverse().map((e) => (
            <li key={e.id} className="text-sm"><p className="text-slate-900">{e.note}</p><p className="text-xs text-slate-500">{formatWatDateTime(e.createdAt)}</p></li>
          ))}
        </ol>
      </Card>

      {!closed && !['IN_PROGRESS', 'READY'].includes(r.status) ? (
        <div className="text-sm">
          {confirmCancel ? (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="font-semibold text-rose-900">Cancel this repair request?</p>
              <label htmlFor="cancel-reason" className="field-label">Reason (optional)</label>
              <input id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="field-input" />
              <div className="flex gap-3">
                <button type="button" disabled={busy !== null} onClick={() => act('cancel', () => apiFetch<{ request: RepairRequestDTO }>(`${base}/cancel`, { method: 'POST', body: { reason: cancelReason } }))} className="btn-primary h-11 bg-rose-600 hover:bg-rose-700">{busy === 'cancel' ? <Spinner /> : null} Yes, cancel it</button>
                <button type="button" onClick={() => setConfirmCancel(false)} className="btn-secondary h-11">Keep it</button>
              </div>
            </div>
          ) : <button type="button" onClick={() => setConfirmCancel(true)} className="font-semibold text-rose-700 underline">Cancel this request</button>}
        </div>
      ) : null}
    </div>
  );
}
