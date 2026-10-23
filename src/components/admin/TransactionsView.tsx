'use client';

/**
 * Paystack transaction log: every payment attempt with its reference, amount in
 * Naira, status and date. Read-only; payments are confirmed by Paystack, not by hand.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { formatMoney } from '@/lib/currency';
import type { AdminTransactionLogDTO, Paginated } from '@/types/admin';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, SearchField, Tabs, formatDateTime, useAdminQuery } from './ui';

type TabValue = 'all' | 'SUCCESS' | 'INITIALIZED' | 'FAILED' | 'ABANDONED' | 'REVERSED' | 'REFUNDED';

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'INITIALIZED', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ABANDONED', label: 'Abandoned' },
  { value: 'REVERSED', label: 'Reversed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: 'Successful',
  INITIALIZED: 'Pending',
  FAILED: 'Failed',
  ABANDONED: 'Abandoned',
  REVERSED: 'Reversed',
  REFUNDED: 'Refunded',
};

function tone(status: string): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  if (status === 'SUCCESS') return 'green';
  if (status === 'INITIALIZED') return 'amber';
  if (status === 'FAILED' || status === 'REVERSED') return 'red';
  if (status === 'REFUNDED') return 'blue';
  return 'slate';
}

export function TransactionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') ?? 'all') as TabValue;
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (q) params.set('q', q);
  params.set('page', String(page));
  const { data, error, loading, reload } = useAdminQuery<Paginated<AdminTransactionLogDTO>>(`/api/admin/transactions?${params.toString()}`);

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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Transactions" description="Every Paystack payment attempt, newest first. Amounts are in Naira." />

      <Panel>
        <div className="px-4 pt-2">
          <Tabs label="Payment status" value={status} options={TABS} onChange={(value) => update({ status: value === 'all' ? null : value })} />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <SearchField id="transaction-search" value={q} onChange={(value) => update({ q: value || null })} placeholder="Reference, order number or email" />
        </div>

        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <LoadingBlock />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title={q || status !== 'all' ? 'No transactions match' : 'No transactions yet'}
            body={q || status !== 'all' ? 'Try a different status or search term.' : 'Payments appear here as soon as a customer starts paying at checkout.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Reference</th>
                    <th className="px-3 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Channel</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="select-all font-mono text-xs font-semibold text-slate-900">{transaction.reference}</span>
                        {transaction.isMock ? <span className="ml-2 text-xs text-slate-400">test</span> : null}
                        <p className="text-xs text-slate-500">{transaction.customerEmail}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{transaction.orderNumber}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatMoney(transaction.amount)}</td>
                      <td className="px-3 py-3">
                        <Pill tone={tone(transaction.status)}>{STATUS_LABEL[transaction.status] ?? transaction.status}</Pill>
                        {transaction.gatewayResponse && transaction.status !== 'SUCCESS' ? <p className="mt-1 max-w-[14rem] truncate text-xs text-slate-500">{transaction.gatewayResponse}</p> : null}
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-600">{transaction.channel?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(transaction.paidAt ?? transaction.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={(next) => update({ page: String(next) })} />
          </>
        )}
      </Panel>
    </div>
  );
}
