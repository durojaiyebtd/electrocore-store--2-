'use client';

/**
 * Sales report for a chosen date range, with CSV downloads and a print view.
 * Definitions: gross = everything charged on orders paid in the period; refunds are
 * taken off to give net revenue. Discounts and delivery fees are shown separately.
 */
import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/lib/currency';
import type { ReportDTO } from '@/types/admin';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Panel, adminButton, adminInput, useAdminQuery } from './ui';

const EXPORTS = [
  { type: 'orders', label: 'Orders', hint: 'Every order placed in the dates chosen' },
  { type: 'transactions', label: 'Payments', hint: 'Paystack payments in the dates chosen' },
  { type: 'customers', label: 'Customers', hint: 'All customer accounts with their spend' },
  { type: 'inventory', label: 'Inventory', hint: 'Current stock for every variant' },
] as const;

/** Today's date in Nigerian time as YYYY-MM-DD */
function todayKey(offsetDays = 0): string {
  const moment = new Date(Date.now() + 60 * 60 * 1000 - offsetDays * 24 * 60 * 60 * 1000);
  return moment.toISOString().slice(0, 10);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export function ReportsView() {
  const [from, setFrom] = useState(todayKey(29));
  const [to, setTo] = useState(todayKey());
  const [applied, setApplied] = useState({ from: todayKey(29), to: todayKey() });
  const [formError, setFormError] = useState<string | null>(null);

  const query = `from=${applied.from}&to=${applied.to}`;
  const { data, error, loading, reload } = useAdminQuery<ReportDTO>(`/api/admin/reports?${query}`);

  function apply(event?: FormEvent) {
    event?.preventDefault();
    if (!from || !to) {
      setFormError('Choose both a start and an end date.');
      return;
    }
    if (from > to) {
      setFormError('The start date must be on or before the end date.');
      return;
    }
    setFormError(null);
    setApplied({ from, to });
  }

  function preset(days: number) {
    const nextFrom = todayKey(days - 1);
    const nextTo = todayKey();
    setFrom(nextFrom);
    setTo(nextTo);
    setFormError(null);
    setApplied({ from: nextFrom, to: nextTo });
  }

  const peak = data ? Math.max(1, ...data.byDay.map((day) => day.revenue)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Sales for any date range. Gross sales minus refunds gives net revenue; discounts and delivery fees are already inside the totals."
        actions={
          <button type="button" onClick={() => window.print()} className={adminButton.secondary}>
            Print summary
          </button>
        }
      />

      <Panel className="print:hidden">
        <form onSubmit={apply} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
          <div>
            <label htmlFor="report-from" className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
            <input id="report-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={adminInput} />
          </div>
          <div>
            <label htmlFor="report-to" className="mb-1.5 block text-sm font-medium text-slate-700">To</label>
            <input id="report-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={adminInput} />
          </div>
          <button type="submit" className={adminButton.primary}>
            Show report
          </button>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {[
              { label: 'Last 7 days', days: 7 },
              { label: 'Last 30 days', days: 30 },
              { label: 'Last 90 days', days: 90 },
            ].map((item) => (
              <button key={item.days} type="button" onClick={() => preset(item.days)} className={adminButton.secondary}>
                {item.label}
              </button>
            ))}
          </div>
        </form>
        {formError ? (
          <div className="px-4 pb-4">
            <ErrorBanner message={formError} />
          </div>
        ) : null}
      </Panel>

      {error ? (
        <ErrorBanner message={error} onRetry={reload} />
      ) : loading || !data ? (
        <LoadingBlock label="Building report…" />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {data.from} to {data.to} (Nigerian time).
          </p>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Gross sales" value={formatMoney(data.gross)} hint={`${data.orders} paid order${data.orders === 1 ? '' : 's'}`} />
            <StatCard label="Refunds" value={formatMoney(data.refunds)} hint={`${data.refundedOrders} refunded order${data.refundedOrders === 1 ? '' : 's'}`} />
            <StatCard label="Net revenue" value={formatMoney(data.net)} hint="Gross sales minus refunds" />
            <StatCard label="Average order" value={formatMoney(data.averageOrderValue)} hint={`${data.unitsSold} unit${data.unitsSold === 1 ? '' : 's'} sold`} />
            <StatCard label="Discounts given" value={formatMoney(data.discounts)} hint="Already deducted from sales" />
            <StatCard label="Delivery fees" value={formatMoney(data.shipping)} hint="Included in gross sales" />
            <StatCard label="Failed payments" value={String(data.failedPayments)} hint="Failed or abandoned at Paystack" />
            <StatCard label="Paid orders" value={String(data.orders)} hint="Orders paid in this period" />
          </div>

          <Panel title="Net revenue by day">
            {data.orders === 0 ? (
              <EmptyState title="No paid orders in this period" body="Pick a wider date range, or check back after your first sale." />
            ) : (
              <div className="overflow-x-auto p-4">
                <div className="flex h-44 min-w-[480px] items-end gap-1" role="img" aria-label="Net revenue per day">
                  {data.byDay.map((day) => (
                    <div key={day.date} className="group relative flex h-full min-w-[6px] flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-brand-600 transition group-hover:bg-brand-700"
                        style={{ height: `${Math.max(day.revenue > 0 ? 4 : 1, (day.revenue / peak) * 100)}%`, opacity: day.revenue > 0 ? 1 : 0.25 }}
                        title={`${day.date}: ${formatMoney(day.revenue)} from ${day.orders} order${day.orders === 1 ? '' : 's'}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Hover a bar for the exact figure. Refunded orders count as zero.</p>
              </div>
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Best sellers">
              {data.topProducts.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No sales in this period.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 text-right font-medium">Units</th>
                      <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topProducts.map((product) => (
                      <tr key={product.sku}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-900">{product.productName}</p>
                          <p className="font-mono text-xs text-slate-500">{product.sku}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{product.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatMoney(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <div className="flex flex-col gap-6">
              <Panel title="Orders by status">
                {data.byStatus.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing to show.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.byStatus.map((row) => (
                      <li key={row.status} className="flex items-center justify-between px-5 py-2.5 text-sm">
                        <span className="text-slate-700">{row.status.charAt(0) + row.status.slice(1).toLowerCase()}</span>
                        <span className="tabular-nums text-slate-900">
                          {row.orders} · {formatMoney(row.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Payments by method">
                {data.byChannel.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">No successful payments in this period.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.byChannel.map((row) => (
                      <li key={row.channel} className="flex items-center justify-between px-5 py-2.5 text-sm">
                        <span className="capitalize text-slate-700">{row.channel.replace(/_/g, ' ')}</span>
                        <span className="tabular-nums text-slate-900">
                          {row.payments} · {formatMoney(row.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}

      <Panel title="Export to CSV (opens in Excel or Google Sheets)" className="print:hidden">
        <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {EXPORTS.map((item) => (
            <li key={item.type} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>
              <a href={`/api/admin/reports/export?type=${item.type}&${query}`} download className={`${adminButton.secondary} mt-3 w-full`}>
                Download CSV
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
