'use client';

/**
 * Admin -> Transactions: every Paystack transaction with its reference, NGN amount,
 * date and verification status. Click an order number to open that order's details.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { formatMoney } from '@/lib/currency';
import type { AdminTransactionLogDTO, TransactionLogDTO } from '@/types/admin';
import { OrderDetailModal, paymentStatusMeta } from './OrderDetailModal';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, SearchField, Tabs, formatCharged, formatDateTime, useAdminQuery } from './ui';

type TabValue = 'all' | AdminTransactionLogDTO['status'];

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'SUCCESS', label: 'Verified' },
  { value: 'INITIALIZED', label: 'Awaiting payment' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ABANDONED', label: 'Abandoned' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'REVERSED', label: 'Reversed' },
];

export function TransactionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') as AdminTransactionLogDTO['status'] | null;
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const [openOrder, setOpenOrder] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  params.set('page', String(page));
  const { data, error, loading, reload } = useAdminQuery<TransactionLogDTO>(`/api/admin/transactions?${params.toString()}`);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in changes)) next.delete('page');
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const cards = data
    ? [
        { label: 'Verified payments', value: formatMoney(data.summary.verifiedAmount), sub: `${data.summary.verifiedCount} transaction${data.summary.verifiedCount === 1 ? '' : 's'} confirmed by Paystack` },
        { label: 'Awaiting payment', value: String(data.summary.pendingCount), sub: 'Sent to Paystack, not paid yet' },
        { label: 'Failed or abandoned', value: String(data.summary.failedCount), sub: 'Declined, cancelled or reversed' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Transactions"
        description="Every Paystack payment attempt: reference, amount, date and whether Paystack verified it."
        actions={
          <button type="button" onClick={reload} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Refresh
          </button>
        }
      />

      {cards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
            </div>
          ))}
        </div>
      ) : null}

      <Panel>
        <div className="px-4 pt-2">
          <Tabs<TabValue> label="Verification status" value={status ?? 'all'} options={TABS} onChange={(value) => update({ status: value === 'all' ? null : value })} />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <SearchField id="tx-search" value={q} onChange={(value) => update({ q: value || null })} placeholder="Reference, order number or email" />
        </div>

        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <LoadingBlock />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title={q || status ? 'No transactions match' : 'No transactions yet'}
            body={q || status ? 'Try another search or status.' : 'A transaction is recorded each time a customer is sent to Paystack to pay.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 font-medium">Paystack reference</th>
                    <th className="px-3 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Channel</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((tx) => {
                    const meta = paymentStatusMeta(tx.status);
                    return (
                      <tr key={tx.id} className="align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDateTime(tx.createdAt)}
                          {tx.paidAt && tx.paidAt !== tx.createdAt ? <p className="text-xs text-slate-400">Paid {formatDateTime(tx.paidAt)}</p> : null}
                        </td>
                        <td className="px-3 py-3">
                          <span className="break-all font-mono text-xs text-slate-900">{tx.reference}</span>
                          {tx.gatewayResponse ? (
                            <p className="mt-0.5 max-w-[16rem] truncate text-xs text-slate-500" title={tx.gatewayResponse}>
                              {tx.gatewayResponse}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => setOpenOrder(tx.orderNumber)} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                            {tx.orderNumber}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-800">{tx.customerName}</p>
                          <p className="text-xs text-slate-500">{tx.customerEmail}</p>
                        </td>
                        <td className="px-3 py-3 capitalize text-slate-600">{tx.channel?.replace(/_/g, ' ') ?? '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Pill tone={meta.tone}>{meta.label}</Pill>
                            {tx.isMock ? <Pill tone="slate">Test</Pill> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCharged(tx.amount, tx.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={(next) => update({ page: String(next) })} />
          </>
        )}
      </Panel>

      <OrderDetailModal orderNumber={openOrder} onClose={() => setOpenOrder(null)} onUpdated={() => reload()} />
    </div>
  );
}
