'use client';

/**
 * Order detail modal (Admin -> Orders): customer, phone, shipping address, Paystack
 * reference(s), items, totals and a status selector. Status changes go through
 * PATCH /api/admin/orders/:orderNumber, which only allows valid next steps
 * (e.g. Paid -> Processing -> Shipped -> Delivered) and writes the change to the
 * order's timeline with the admin's email. Refunds and review notes stay on the
 * full order page.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import type { OrderStatus } from '@/types';
import type { AdminOrderDetailDTO } from '@/types/admin';
import { ProductImage } from '@/components/product/ProductImage';
import { ErrorBanner, LoadingBlock, Modal, Pill, StatusBadge, adminButton, adminInput, formatCharged, formatDateTime, orderStatusLabel } from './ui';

const PAYMENT_LABEL: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'slate' | 'blue' }> = {
  SUCCESS: { label: 'Verified', tone: 'green' },
  INITIALIZED: { label: 'Awaiting payment', tone: 'amber' },
  FAILED: { label: 'Failed', tone: 'red' },
  ABANDONED: { label: 'Abandoned', tone: 'slate' },
  REVERSED: { label: 'Reversed', tone: 'red' },
  REFUNDED: { label: 'Refunded', tone: 'blue' },
};

export function paymentStatusMeta(status: string) {
  return PAYMENT_LABEL[status] ?? { label: status, tone: 'slate' as const };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="rounded px-1.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
      aria-label={label}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function OrderDetailModal({
  orderNumber,
  onClose,
  onUpdated,
}: {
  /** null = closed */
  orderNumber: string | null;
  onClose: () => void;
  onUpdated: (order: AdminOrderDetailDTO) => void;
}) {
  const [order, setOrder] = useState<AdminOrderDetailDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    setOrder(null);
    setLoadError(null);
    setNextStatus('');
    setNote('');
    setRestock(true);
    setSaveError(null);
    setFlash(null);
    const controller = new AbortController();
    apiFetch<AdminOrderDetailDTO>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, { signal: controller.signal })
      .then(setOrder)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoadError(err instanceof Error ? err.message : 'Could not load this order.');
      });
    return () => controller.abort();
  }, [orderNumber]);

  async function saveStatus() {
    if (!order || !nextStatus) return;
    setSaving(true);
    setSaveError(null);
    setFlash(null);
    try {
      const updated = await apiFetch<AdminOrderDetailDTO>(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}`, {
        method: 'PATCH',
        body: { status: nextStatus, note: note.trim() || undefined, restock: nextStatus === 'CANCELLED' ? restock : undefined },
      });
      setOrder(updated);
      onUpdated(updated);
      setFlash(`Status changed to ${orderStatusLabel(nextStatus).toLowerCase()}.`);
      setNextStatus('');
      setNote('');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not update the status.');
    } finally {
      setSaving(false);
    }
  }

  const open = orderNumber !== null;
  const wasPaid = Boolean(order?.paidAt);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="xl"
      title={orderNumber ? `Order ${orderNumber}` : 'Order'}
      description={order ? `Placed ${formatDateTime(order.createdAt)}${order.paidAt ? ` · paid ${formatDateTime(order.paidAt)}` : ''}` : undefined}
      footer={
        <>
          {orderNumber ? (
            <Link href={`/admin/orders/${encodeURIComponent(orderNumber)}`} className="mr-auto text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
              Full order page (refunds, timeline)
            </Link>
          ) : null}
          <button type="button" onClick={onClose} disabled={saving} className={adminButton.secondary}>
            Close
          </button>
        </>
      }
    >
      {loadError ? (
        <ErrorBanner message={loadError} />
      ) : !order ? (
        <LoadingBlock label="Loading order…" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {order.needsReview ? <Pill tone="amber">Needs review</Pill> : null}
            <Pill tone={order.isRegisteredCustomer ? 'blue' : 'slate'}>{order.isRegisteredCustomer ? 'Registered customer' : 'Guest order'}</Pill>
            <span className="ml-auto text-xl font-semibold tabular-nums text-slate-900">{formatMoney(order.total)}</span>
          </div>

          {order.needsReview && order.reviewReason ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{order.reviewReason}</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-xl border border-slate-200 p-4" aria-labelledby="od-customer">
              <h3 id="od-customer" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </h3>
              <p className="mt-2 font-medium text-slate-900">{order.customerName}</p>
              <p className="mt-1 break-all text-sm text-slate-600">{order.email}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-900">
                <span className="font-mono tabular-nums">{order.phone}</span>
                <CopyButton text={order.phone} label="Copy phone number" />
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 p-4" aria-labelledby="od-shipping">
              <h3 id="od-shipping" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Shipping address
              </h3>
              <address className="mt-2 text-sm not-italic leading-relaxed text-slate-800">
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
              {order.notes ? <p className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">Note: {order.notes}</p> : null}
            </section>

            <section className="rounded-xl border border-slate-200 p-4" aria-labelledby="od-payment">
              <h3 id="od-payment" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paystack
              </h3>
              {order.transactions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No payment started.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-3">
                  {order.transactions.map((tx) => {
                    const meta = paymentStatusMeta(tx.status);
                    return (
                      <li key={tx.reference} className="text-sm">
                        <p className="flex flex-wrap items-center gap-1">
                          <span className="break-all font-mono text-xs text-slate-900">{tx.reference}</span>
                          <CopyButton text={tx.reference} label={`Copy Paystack reference ${tx.reference}`} />
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Pill tone={meta.tone}>{meta.label}</Pill>
                          {tx.isMock ? <Pill tone="slate">Test (mock)</Pill> : null}
                          <span className="text-xs capitalize text-slate-500">{tx.channel?.replace(/_/g, ' ') ?? ''}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatCharged(tx.amount, tx.currency)} · {tx.paidAt ? `paid ${formatDateTime(tx.paidAt)}` : `started ${formatDateTime(tx.createdAt)}`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <section aria-labelledby="od-items">
            <h3 id="od-items" className="text-sm font-semibold text-slate-900">
              Items
            </h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {order.items.map((item) => (
                <li key={`${item.variantId}-${item.sku}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    <ProductImage src={item.image} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{item.productName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {item.variantName !== 'Standard' ? `${item.variantName} · ` : ''}
                      <span className="font-mono">{item.sku}</span> · {formatMoney(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium tabular-nums text-slate-900">{formatMoney(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Delivery</dt>
                <dd className="tabular-nums">{order.shippingFee === 0 ? 'Free' : formatMoney(order.shippingFee)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatMoney(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="od-status" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 id="od-status" className="text-sm font-semibold text-slate-900">
              Update status
            </h3>
            {order.allowedTransitions.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">
                {orderStatusLabel(order.status)} is a final status. {order.canRefund ? 'Refunds are on the full order page.' : ''}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
                <div>
                  <label htmlFor="od-next-status" className="mb-1.5 block text-xs font-medium text-slate-600">
                    New status
                  </label>
                  <select id="od-next-status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus | '')} className={adminInput}>
                    <option value="">Choose…</option>
                    {order.allowedTransitions.map((status) => (
                      <option key={status} value={status}>
                        {orderStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="od-note" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Note for the timeline <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="od-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    placeholder={nextStatus === 'SHIPPED' ? 'e.g. GIG Logistics, waybill 123456' : 'e.g. Called customer to confirm'}
                    className={adminInput}
                  />
                </div>
                <button type="button" disabled={!nextStatus || saving} onClick={() => void saveStatus()} className={adminButton.primary}>
                  {saving ? <Spinner /> : null}
                  Update
                </button>
                {nextStatus === 'CANCELLED' && wasPaid ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3">
                    <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                    Put the items back into stock
                  </label>
                ) : null}
                {nextStatus === 'CANCELLED' && wasPaid ? (
                  <p className="text-xs text-amber-800 sm:col-span-3">Cancelling does not return the customer&apos;s money. Use Refund on the full order page for that.</p>
                ) : null}
              </div>
            )}
            {saveError ? (
              <div className="mt-3">
                <ErrorBanner message={saveError} />
              </div>
            ) : null}
            {flash ? (
              <p role="status" className="mt-3 text-sm font-medium text-emerald-700">
                {flash}
              </p>
            ) : null}
          </section>
        </div>
      )}
    </Modal>
  );
}
