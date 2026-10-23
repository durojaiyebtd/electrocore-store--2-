'use client';

/**
 * Side drawer for one order: who it is for, where it is going, the Paystack
 * reference and a status dropdown that updates the order live.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import type { OrderStatus } from '@/types';
import type { AdminOrderDetailDTO } from '@/types/admin';
import { ErrorBanner, LoadingBlock, Pill, StatusBadge, adminButton, adminInput, formatDateTime, orderStatusLabel, useAdminQuery } from './ui';

interface OrderDrawerProps {
  orderNumber: string;
  onClose: () => void;
  /** Called after a status change so the list behind the drawer refreshes. */
  onChanged: () => void;
}

function paymentTone(status: string): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'SUCCESS') return 'green';
  if (status === 'INITIALIZED') return 'amber';
  if (status === 'FAILED' || status === 'REVERSED') return 'red';
  return 'slate';
}

export function OrderDrawer({ orderNumber, onClose, onChanged }: OrderDrawerProps) {
  const { data, setData, error, loading, reload } = useAdminQuery<AdminOrderDetailDTO>(`/api/admin/orders/${orderNumber}`);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [restock, setRestock] = useState(true);
  const [confirmShip, setConfirmShip] = useState(false);
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function changeStatus(status: OrderStatus, withRestock = true) {
    setSaving(true);
    setActionError(null);
    setFlash(null);
    try {
      const updated = await apiFetch<AdminOrderDetailDTO>(`/api/admin/orders/${orderNumber}`, {
        method: 'PATCH',
        body: { status, restock: withRestock, courier: status === 'SHIPPED' ? courier || undefined : undefined, trackingNumber: status === 'SHIPPED' ? trackingNumber || undefined : undefined },
      });
      setData(updated);
      setConfirmCancel(false);
      setConfirmShip(false);
      setFlash(`Status updated to ${orderStatusLabel(status)}.`);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the order.');
    } finally {
      setSaving(false);
    }
  }

  function onSelect(value: string) {
    if (!value) return;
    const status = value as OrderStatus;
    if (status === 'CANCELLED') {
      setConfirmCancel(true);
      return;
    }
    if (status === 'SHIPPED') {
      setConfirmShip(true);
      return;
    }
    void changeStatus(status);
  }

  const address = data?.shippingAddress;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Order ${orderNumber}`}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/30" onClick={onClose} aria-hidden="true" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col bg-white shadow-2xl motion-reduce:animate-none">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-brand-700">{orderNumber}</p>
            {data ? <p className="mt-0.5 text-xs text-slate-500">Placed {formatDateTime(data.createdAt)}</p> : null}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close order">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error ? (
            <ErrorBanner message={error} onRetry={reload} />
          ) : loading || !data ? (
            <LoadingBlock label="Loading order…" />
          ) : (
            <div className="flex flex-col gap-6">
              <section aria-labelledby="drawer-status">
                <h2 id="drawer-status" className="text-sm font-semibold text-slate-900">
                  Fulfilment status
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={data.status} />
                  {data.needsReview ? <Pill tone="amber">Needs review</Pill> : null}
                </div>
                {data.allowedTransitions.length > 0 ? (
                  <div className="mt-3">
                    <label htmlFor="drawer-status-select" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Move this order to
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="drawer-status-select"
                        className={adminInput}
                        value=""
                        disabled={saving}
                        onChange={(event) => onSelect(event.target.value)}
                      >
                        <option value="">Choose a new status…</option>
                        {data.allowedTransitions.map((status) => (
                          <option key={status} value={status}>
                            {orderStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      {saving ? <Spinner /> : null}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">This order is {orderStatusLabel(data.status).toLowerCase()}, so its status can no longer be changed here.</p>
                )}
                {confirmShip ? (
                  <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-slate-800">
                    <p className="font-medium">Mark as shipped</p>
                    <p className="mt-1 text-slate-600">Add the courier and tracking number so the order record shows how it was sent. Both are optional.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="drawer-courier" className="mb-1 block text-xs font-medium text-slate-600">Courier</label>
                        <input id="drawer-courier" value={courier} onChange={(e) => setCourier(e.target.value)} maxLength={60} placeholder="GIG Logistics" className={adminInput} />
                      </div>
                      <div>
                        <label htmlFor="drawer-tracking" className="mb-1 block text-xs font-medium text-slate-600">Tracking number</label>
                        <input id="drawer-tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} maxLength={80} placeholder="GIG123456789" className={adminInput} />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" className={adminButton.primary} disabled={saving} onClick={() => void changeStatus('SHIPPED')}>
                        Confirm shipped
                      </button>
                      <button type="button" className={adminButton.secondary} disabled={saving} onClick={() => setConfirmShip(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
                {confirmCancel ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                    <p className="font-medium">Cancel this order?</p>
                    {data.paidAt && !data.restockedAt ? (
                      <label className="mt-2 flex items-center gap-2">
                        <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                        Return the items to stock
                      </label>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button type="button" className={adminButton.danger} disabled={saving} onClick={() => void changeStatus('CANCELLED', restock)}>
                        Yes, cancel order
                      </button>
                      <button type="button" className={adminButton.secondary} disabled={saving} onClick={() => setConfirmCancel(false)}>
                        Keep order
                      </button>
                    </div>
                  </div>
                ) : null}
                {flash ? (
                  <p role="status" className="mt-3 text-sm font-medium text-emerald-700">
                    {flash}
                  </p>
                ) : null}
                {actionError ? (
                  <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
                    {actionError}
                  </p>
                ) : null}
              </section>

              <section aria-labelledby="drawer-customer">
                <h2 id="drawer-customer" className="text-sm font-semibold text-slate-900">
                  Customer
                </h2>
                <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="text-slate-900">{data.customerName}</dd>
                  <dt className="text-slate-500">Phone</dt>
                  <dd>
                    <a href={`tel:${data.phone}`} className="text-brand-700 hover:underline">
                      {data.phone}
                    </a>
                  </dd>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="break-all">
                    <a href={`mailto:${data.email}`} className="text-brand-700 hover:underline">
                      {data.email}
                    </a>
                  </dd>
                </dl>
              </section>

              <section aria-labelledby="drawer-address">
                <h2 id="drawer-address" className="text-sm font-semibold text-slate-900">
                  Delivery address
                </h2>
                {address ? (
                  <address className="mt-2 text-sm not-italic leading-relaxed text-slate-700">
                    {address.line1}
                    <br />
                    {address.line2 ? (
                      <>
                        {address.line2}
                        <br />
                      </>
                    ) : null}
                    {address.city}, {address.state}
                    {address.postalCode ? ` ${address.postalCode}` : ''}
                    <br />
                    {address.country}
                  </address>
                ) : null}
                {data.notes ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Customer note: {data.notes}</p> : null}
              </section>

              <section aria-labelledby="drawer-payment">
                <h2 id="drawer-payment" className="text-sm font-semibold text-slate-900">
                  Paystack payment
                </h2>
                {data.transactions.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No payment attempt yet.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {data.transactions.map((transaction) => (
                      <li key={transaction.reference} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="select-all break-all font-mono text-xs font-semibold text-slate-900">{transaction.reference}</span>
                          <Pill tone={paymentTone(transaction.status)}>{transaction.status.toLowerCase()}</Pill>
                        </div>
                        <p className="mt-1.5 text-slate-600">
                          {formatMoney(transaction.amount)}
                          {transaction.channel ? ` · ${transaction.channel.replace(/_/g, ' ')}` : ''}
                          {transaction.isMock ? ' · test payment' : ''}
                        </p>
                        {transaction.paidAt ? <p className="text-xs text-slate-500">Paid {formatDateTime(transaction.paidAt)}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="drawer-items">
                <h2 id="drawer-items" className="text-sm font-semibold text-slate-900">
                  Items
                </h2>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {data.items.map((item) => (
                    <li key={`${item.variantId}-${item.sku}`} className="flex justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-slate-900">{item.productName}</span>
                        <span className="block text-xs text-slate-500">
                          {item.variantName ? `${item.variantName} · ` : ''}
                          {item.quantity} × {formatMoney(item.unitPrice)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-900">{formatMoney(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Subtotal</dt>
                    <dd className="tabular-nums">{formatMoney(data.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Delivery</dt>
                    <dd className="tabular-nums">{data.shippingFee === 0 ? 'Free' : formatMoney(data.shippingFee)}</dd>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatMoney(data.total)}</dd>
                  </div>
                </dl>
              </section>

              <Link href={`/admin/orders/${orderNumber}`} className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
                Open the full order page (refunds, timeline)
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
