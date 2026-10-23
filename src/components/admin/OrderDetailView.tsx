'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertIcon, ChevronLeftIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';
import type { AdminOrderDetailDTO } from '@/types/admin';
import { ErrorBanner, LoadingBlock, Panel, Pill, StatusBadge, adminButton, adminInput, formatDateTime, orderStatusLabel, useAdminQuery } from './ui';
import { ProductImage } from '@/components/product/ProductImage';

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PROCESSING: 'Start processing',
  SHIPPED: 'Mark as shipped / fulfilled',
  DELIVERED: 'Mark as delivered',
  CANCELLED: 'Cancel order',
};

type Dialog = { kind: 'status'; status: OrderStatus } | { kind: 'refund' } | { kind: 'review' } | { kind: 'tracking' } | null;

export function OrderDetailView({ orderNumber }: { orderNumber: string }) {
  const { data: order, setData, error, loading, reload } = useAdminQuery<AdminOrderDetailDTO>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [method, setMethod] = useState<'paystack' | 'manual'>('paystack');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  function open(next: Dialog) {
    setDialog(next);
    setNote('');
    setRestock(true);
    setMethod('paystack');
    setCourier(order?.courier ?? '');
    setTrackingNumber(order?.trackingNumber ?? '');
    setActionError(null);
    setFlash(null);
  }

  async function submit() {
    if (!dialog || !order) return;
    setBusy(true);
    setActionError(null);
    try {
      let updated: AdminOrderDetailDTO;
      if (dialog.kind === 'status') {
        updated = await apiFetch<AdminOrderDetailDTO>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
          method: 'PATCH',
          body: { status: dialog.status, note: note || undefined, restock, courier: courier || undefined, trackingNumber: trackingNumber || undefined },
        });
        setFlash(`Order marked as ${orderStatusLabel(dialog.status).toLowerCase()}.`);
      } else if (dialog.kind === 'tracking') {
        updated = await apiFetch<AdminOrderDetailDTO>(`/api/admin/orders/${encodeURIComponent(orderNumber)}/tracking`, {
          method: 'POST',
          body: { courier, trackingNumber },
        });
        setFlash('Tracking details saved.');
      } else if (dialog.kind === 'refund') {
        updated = await apiFetch<AdminOrderDetailDTO>(`/api/admin/orders/${encodeURIComponent(orderNumber)}/refund`, {
          method: 'POST',
          body: { method, note: note || undefined, restock },
        });
        setFlash(method === 'paystack' ? 'Refund sent to Paystack.' : 'Manual refund recorded.');
      } else {
        updated = await apiFetch<AdminOrderDetailDTO>(`/api/admin/orders/${encodeURIComponent(orderNumber)}/review`, {
          method: 'POST',
          body: { note },
        });
        setFlash('Review marked as resolved.');
      }
      setData(updated);
      setDialog(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (loading || !order) return <LoadingBlock label="Loading order…" />;

  const wasPaid = Boolean(order.paidAt);
  const physical = order.items.some((item) => item.fulfillment === 'PHYSICAL');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ChevronLeftIcon size={16} />
          Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-semibold text-slate-900 sm:text-2xl">{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
          {order.needsReview ? <Pill tone="amber">Needs review</Pill> : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Placed {formatDateTime(order.createdAt)}
          {order.paidAt ? ` · paid ${formatDateTime(order.paidAt)}` : ''}
        </p>
      </div>

      {flash ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash}</p> : null}

      {order.needsReview ? (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertIcon size={18} className="mt-0.5 shrink-0" />
          <p className="min-w-0 flex-1">{order.reviewReason ?? 'This order was flagged for manual review.'}</p>
          <button type="button" onClick={() => open({ kind: 'review' })} className="font-semibold underline">
            Mark resolved
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {order.allowedTransitions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => open({ kind: 'status', status })}
            className={status === 'CANCELLED' ? adminButton.danger : adminButton.primary}
          >
            {ACTION_LABEL[status] ?? `Mark ${orderStatusLabel(status).toLowerCase()}`}
          </button>
        ))}
        {order.canRefund ? (
          <button type="button" onClick={() => open({ kind: 'refund' })} className={adminButton.secondary}>
            Refund
          </button>
        ) : null}
        {['PAID', 'PROCESSING', 'SHIPPED'].includes(order.status) ? (
          <button type="button" onClick={() => open({ kind: 'tracking' })} className={adminButton.secondary}>
            {order.trackingNumber ? 'Edit tracking' : 'Add tracking'}
          </button>
        ) : null}
        <button type="button" onClick={() => window.print()} className={adminButton.secondary}>
          Print
        </button>
        <Link href={`mailto:${order.email}?subject=${encodeURIComponent(`Your order ${order.orderNumber}`)}`} className={adminButton.secondary}>
          Email customer
        </Link>
      </div>

      {dialog ? (
        <Panel title={dialog.kind === 'refund' ? 'Refund this order' : dialog.kind === 'review' ? 'Resolve review' : dialog.kind === 'tracking' ? 'Courier and tracking' : ACTION_LABEL[dialog.status] ?? 'Update status'}>
          <div className="flex flex-col gap-4 p-5">
            {dialog.kind === 'status' && dialog.status === 'CANCELLED' && wasPaid ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This order was paid {formatMoney(order.total)}. Cancelling does not return money — use Refund afterwards if the customer is owed.
              </p>
            ) : null}
            {dialog.kind === 'tracking' || (dialog.kind === 'status' && dialog.status === 'SHIPPED') ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="courier" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Courier {dialog.kind === 'status' ? <span className="font-normal text-slate-400">(optional)</span> : null}
                  </label>
                  <input id="courier" value={courier} onChange={(e) => setCourier(e.target.value)} maxLength={60} placeholder="e.g. GIG Logistics" required={dialog.kind === 'tracking'} className={adminInput} />
                </div>
                <div>
                  <label htmlFor="tracking-number" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tracking number {dialog.kind === 'status' ? <span className="font-normal text-slate-400">(optional)</span> : null}
                  </label>
                  <input id="tracking-number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} maxLength={80} placeholder="e.g. GIG123456789" required={dialog.kind === 'tracking'} className={adminInput} />
                </div>
              </div>
            ) : null}
            {dialog.kind === 'refund' ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium text-slate-700">How was the money returned?</legend>
                <label className="flex items-start gap-2 text-sm">
                  <input type="radio" name="refund-method" checked={method === 'paystack'} onChange={() => setMethod('paystack')} className="mt-1 accent-brand-600" />
                  <span>
                    <strong>Refund through Paystack</strong>
                    <span className="block text-slate-500">Sends {formatMoney(order.total)} back to the customer’s card or account. Paystack processes it within a few days.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input type="radio" name="refund-method" checked={method === 'manual'} onChange={() => setMethod('manual')} className="mt-1 accent-brand-600" />
                  <span>
                    <strong>Already refunded another way</strong>
                    <span className="block text-slate-500">Bank transfer or cash. Only records the refund here.</span>
                  </span>
                </label>
              </fieldset>
            ) : null}
            {(dialog.kind === 'refund' || (dialog.kind === 'status' && dialog.status === 'CANCELLED')) && wasPaid && !order.restockedAt ? (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                Put the items back into stock
              </label>
            ) : null}
            <div>
              <label htmlFor="action-note" className="mb-1.5 block text-sm font-medium text-slate-700">
                {dialog.kind === 'review' ? 'How was it resolved?' : 'Note for the timeline'}{' '}
                {dialog.kind !== 'review' && dialog.kind !== 'tracking' ? <span className="font-normal text-slate-400">(optional)</span> : null}
              </label>
              <textarea
                id="action-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={dialog.kind === 'status' && dialog.status === 'SHIPPED' ? 'Courier and tracking number, e.g. GIG Logistics 12345' : ''}
                className={cn(adminInput, 'h-auto py-2')}
              />
            </div>
            {actionError ? <ErrorBanner message={actionError} /> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy || (dialog.kind === 'review' && note.trim().length < 3) || (dialog.kind === 'tracking' && (courier.trim().length < 2 || trackingNumber.trim().length < 3))}
                className={dialog.kind === 'status' && dialog.status === 'CANCELLED' ? adminButton.danger : adminButton.primary}
              >
                {busy ? <Spinner /> : null}
                {dialog.kind === 'refund' ? (method === 'paystack' ? `Refund ${formatMoney(order.total)}` : 'Record refund') : dialog.kind === 'review' ? 'Mark resolved' : dialog.kind === 'tracking' ? 'Save tracking' : 'Confirm'}
              </button>
              <button type="button" onClick={() => setDialog(null)} className={adminButton.secondary}>
                Back
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Items">
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.variantId} className="flex gap-4 px-5 py-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <ProductImage src={item.image} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/admin/products/${item.productId}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {item.productName}
                    </Link>
                    <p className="text-slate-500">
                      {item.variantName !== 'Standard' ? `${item.variantName} · ` : ''}
                      <span className="font-mono text-xs">{item.sku}</span>
                    </p>
                    {item.fulfillment !== 'PHYSICAL' ? <p className="mt-1 text-xs font-medium text-brand-700">{item.fulfillment === 'DIGITAL' ? 'Send licence key by email' : 'Schedule service with customer'}</p> : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold tabular-nums text-slate-900">{formatMoney(item.lineTotal)}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {item.quantity} × {formatMoney(item.unitPrice)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="tabular-nums">{order.shippingFee === 0 ? 'Free' : formatMoney(order.shippingFee)}</dd>
              </div>
              <div className="flex justify-between pt-1.5 text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Timeline">
            {order.events.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No history recorded for this order.</p>
            ) : (
              <ol className="relative px-5 py-4">
                {order.events.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < order.events.length - 1 ? <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" aria-hidden="true" /> : null}
                    <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600 ring-4 ring-brand-50" aria-hidden="true" />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-slate-900">{orderStatusLabel(event.status)}</p>
                      {event.note ? <p className="text-slate-600">{event.note}</p> : null}
                      <p className="text-xs text-slate-400">
                        {formatDateTime(event.at)} · {event.actor}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Customer">
            <div className="space-y-1 px-5 py-4 text-sm">
              <p className="font-medium text-slate-900">{order.customerName}</p>
              <p className="break-all text-slate-600">{order.email}</p>
              <p className="text-slate-600">{order.phone}</p>
              <p className="pt-1 text-xs text-slate-400">{order.isRegisteredCustomer ? 'Registered account' : 'Guest checkout'}</p>
            </div>
          </Panel>
          <Panel title={physical ? 'Delivery address' : 'Billing address'}>
            <address className="px-5 py-4 text-sm not-italic leading-relaxed text-slate-700">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? (
                <>
                  <br />
                  {order.shippingAddress.line2}
                </>
              ) : null}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}
              {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
              <br />
              {order.shippingAddress.country}
            </address>
            {order.notes ? (
              <div className="border-t border-slate-100 px-5 py-3 text-sm">
                <p className="text-xs font-medium text-slate-500">Customer note</p>
                <p className="mt-0.5 text-slate-700">{order.notes}</p>
              </div>
            ) : null}
          </Panel>
          <Panel title="Shipping and tracking">
            {order.trackingNumber || order.courier ? (
              <dl className="space-y-1 px-5 py-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Courier</dt>
                  <dd className="text-right font-medium text-slate-900">{order.courier ?? 'Not recorded'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tracking number</dt>
                  <dd className="break-all text-right font-mono text-slate-900">{order.trackingNumber ?? 'Not recorded'}</dd>
                </div>
                {order.shippedAt ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Shipped</dt>
                    <dd className="text-right text-slate-900">{formatDateTime(order.shippedAt)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-500">No courier or tracking number yet. They are added when you mark the order as shipped.</p>
            )}
          </Panel>
          <Panel title="Payments">
            {order.transactions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No payment attempts.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {order.transactions.map((tx) => (
                  <li key={tx.reference} className="space-y-1 px-5 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold tabular-nums text-slate-900">
                        {tx.currency} {(tx.amount / 100).toLocaleString('en-NG')}
                      </span>
                      <Pill tone={tx.status === 'SUCCESS' ? 'green' : tx.status === 'REFUNDED' ? 'blue' : tx.status === 'INITIALIZED' ? 'slate' : 'red'}>
                        {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                      </Pill>
                    </div>
                    <p className="break-all font-mono text-xs text-slate-500">{tx.reference}</p>
                    <p className="text-xs text-slate-500">
                      {tx.channel ? `${tx.channel.replace(/_/g, ' ')} · ` : ''}
                      {tx.gatewayResponse ?? 'Awaiting customer'}
                      {tx.isMock ? ' · mock' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
