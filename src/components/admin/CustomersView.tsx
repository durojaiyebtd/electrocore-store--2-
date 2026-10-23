'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/utils';
import type { AdminCustomerDTO, Paginated } from '@/types/admin';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, SearchField, useAdminQuery } from './ui';

export function CustomersView() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminCustomerDTO | null>(null);
  const { data, setData, error, loading, reload } = useAdminQuery<Paginated<AdminCustomerDTO>>(
    `/api/admin/customers?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
  );

  async function changeRole(customer: AdminCustomerDTO) {
    const role = customer.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    setPending(customer.id);
    setActionError(null);
    try {
      await apiFetch(`/api/admin/customers/${customer.id}`, { method: 'PATCH', body: { role } });
      setData((current) => (current ? { ...current, items: current.items.map((c) => (c.id === customer.id ? { ...c, role } : c)) } : current));
      setConfirming(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not change the role.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customers" description="Registered accounts with their order history. Guest checkouts appear on orders only." />

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="min-w-0 flex-1">
            {confirming.role === 'ADMIN'
              ? `Remove admin access from ${confirming.name}? They will be signed out of the portal on their next request.`
              : `Give ${confirming.name} full admin access? They will be able to change orders, prices, refunds and other admins.`}
          </p>
          <button type="button" onClick={() => void changeRole(confirming)} disabled={pending === confirming.id} className="font-semibold underline">
            {confirming.role === 'ADMIN' ? 'Remove access' : 'Grant access'}
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="font-semibold">
            Cancel
          </button>
        </div>
      ) : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}

      <Panel>
        <div className="px-4 py-3">
          <SearchField
            id="customer-search"
            value={q}
            onChange={(value) => {
              setQ(value);
              setPage(1);
            }}
            placeholder="Name, email or phone"
          />
        </div>
        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <LoadingBlock />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No customers found" body={q ? 'Try another name or email.' : 'Customers appear here when they create an account.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Joined</th>
                    <th className="px-3 py-2.5 text-right font-medium">Orders</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total spent</th>
                    <th className="px-3 py-2.5 font-medium">Last order</th>
                    <th className="px-4 py-2.5 text-right font-medium">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500">
                          {customer.email}
                          {customer.phone ? ` · ${customer.phone}` : ''}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(customer.createdAt)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-800">{customer.orderCount}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">{formatMoney(customer.totalSpent)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {customer.role === 'ADMIN' ? <Pill tone="blue">Admin</Pill> : null}
                          <Link href={`/admin/orders?q=${encodeURIComponent(customer.email)}`} className="text-xs font-semibold text-brand-700 hover:underline">
                            Orders
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirming(customer);
                              setActionError(null);
                            }}
                            className="text-xs font-semibold text-slate-600 hover:text-brand-700"
                          >
                            {customer.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
          </>
        )}
      </Panel>
    </div>
  );
}
