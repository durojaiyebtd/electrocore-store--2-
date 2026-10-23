'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { formatMoney } from '@/lib/currency';
import type { OrderStatus } from '@/types';
import { OrderDrawer } from './OrderDrawer';
import type { AdminOrderSummaryDTO, Paginated } from '@/types/admin';
import {
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  Pill,
  SearchField,
  StatusBadge,
  Tabs,
  formatDateTime,
  useAdminQuery,
} from './ui';

type TabValue = 'all' | 'review' | OrderStatus;

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'PAID', label: 'To fulfil' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'review', label: 'Needs review' },
  { value: 'PENDING', label: 'Awaiting payment' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'FAILED', label: 'Failed' },
];

export function OrdersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const review = searchParams.get('review') === '1';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const tab: TabValue = review ? 'review' : ((status as OrderStatus | null) ?? 'all');

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (review) params.set('review', '1');
  if (q) params.set('q', q);
  params.set('page', String(page));
  const { data, error, loading, reload } = useAdminQuery<Paginated<AdminOrderSummaryDTO>>(`/api/admin/orders?${params.toString()}`);
  const [openOrder, setOpenOrder] = useState<string | null>(null);

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
      <PageHeader title="Orders" description="Fulfil paid orders, update delivery status, cancel or refund." />

      <Panel>
        <div className="px-4 pt-2">
          <Tabs
            label="Order status"
            value={tab}
            options={TABS}
            onChange={(value) =>
              update(value === 'all' ? { status: null, review: null } : value === 'review' ? { status: null, review: '1' } : { status: value, review: null })
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <SearchField id="order-search" value={q} onChange={(value) => update({ q: value || null })} placeholder="Order number, name, email or phone" />
        </div>

        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <LoadingBlock />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title={q ? 'No orders match your search' : 'No orders here yet'}
            body={q ? 'Check the spelling, or search by order number (MES-…).' : 'Orders appear here once customers check out.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Payment</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setOpenOrder(order.orderNumber)}
                          className="font-mono text-xs font-semibold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                          aria-label={`Open order ${order.orderNumber}`}
                        >
                          {order.orderNumber}
                        </button>
                        <p className="text-xs text-slate-500">{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDateTime(order.createdAt)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">{order.customerName}</p>
                        <p className="text-xs text-slate-500">{order.email}</p>
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-600">{order.paymentChannel?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={order.status} />
                          {order.needsReview ? <Pill tone="amber">Review</Pill> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatMoney(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={(next) => update({ page: String(next) })} />
          </>
        )}
      </Panel>
      {openOrder ? <OrderDrawer orderNumber={openOrder} onClose={() => setOpenOrder(null)} onChanged={reload} /> : null}
    </div>
  );
}
