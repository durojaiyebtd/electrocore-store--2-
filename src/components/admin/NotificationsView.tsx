'use client';

/** Things that need attention, newest first: paid orders, flagged orders, stock, failed payments, refunds. */
import Link from 'next/link';
import { useState } from 'react';
import type { AdminNotificationDTO } from '@/types/admin';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Panel, Pill, Tabs, adminButton, formatRelative, useAdminQuery } from './ui';

type Filter = 'all' | 'orders' | 'stock' | 'payments';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'orders', label: 'Orders' },
  { value: 'stock', label: 'Stock' },
  { value: 'payments', label: 'Payments' },
];

const GROUP: Record<AdminNotificationDTO['kind'], Filter> = {
  new_order: 'orders',
  review: 'orders',
  refund: 'payments',
  failed_payment: 'payments',
  low_stock: 'stock',
  out_of_stock: 'stock',
};

const TONE: Record<AdminNotificationDTO['kind'], { label: string; tone: 'green' | 'amber' | 'red' | 'slate' | 'blue' }> = {
  new_order: { label: 'New order', tone: 'green' },
  review: { label: 'Review', tone: 'amber' },
  low_stock: { label: 'Low stock', tone: 'amber' },
  out_of_stock: { label: 'Out of stock', tone: 'red' },
  failed_payment: { label: 'Payment', tone: 'red' },
  refund: { label: 'Refund', tone: 'blue' },
};

export function NotificationsView() {
  const { data, error, loading, reload } = useAdminQuery<AdminNotificationDTO[]>('/api/admin/notifications');
  const [filter, setFilter] = useState<Filter>('all');

  const items = (data ?? []).filter((item) => filter === 'all' || GROUP[item.kind] === filter);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notifications"
        description="Paid orders waiting to ship, flagged orders, low stock, failed payments and refunds from the last 14 days."
        actions={
          <button type="button" onClick={reload} className={adminButton.secondary}>
            Refresh
          </button>
        }
      />
      <Panel>
        <div className="px-4 pt-2">
          <Tabs<Filter> label="Notification type" value={filter} options={FILTERS} onChange={setFilter} />
        </div>
        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="Nothing needs your attention" body="New orders, low stock and payment problems will show up here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50">
                  <span className="mt-0.5 shrink-0">
                    <Pill tone={TONE[item.kind].tone}>{TONE[item.kind].label}</Pill>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                    <span className="block text-sm text-slate-600">{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{formatRelative(item.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
