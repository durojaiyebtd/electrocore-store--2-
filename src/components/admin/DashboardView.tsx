'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { DashboardDTO } from '@/types/admin';
import { ErrorBanner, LoadingBlock, PageHeader, Panel, Pill, StatusBadge, adminButton, formatRelative, useAdminQuery } from './ui';

function changeLabel(current: number, previous: number): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (previous === 0) return current > 0 ? { text: 'New this period', tone: 'up' } : { text: 'No sales yet', tone: 'flat' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: 'Same as previous 30 days', tone: 'flat' };
  return { text: `${pct > 0 ? '+' : ''}${pct}% vs previous 30 days`, tone: pct > 0 ? 'up' : 'down' };
}

function compactNaira(kobo: number): string {
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(naira >= 10_000_000 ? 0 : 1)}m`;
  if (naira >= 1_000) return `₦${Math.round(naira / 1_000)}k`;
  return `₦${Math.round(naira)}`;
}

function SalesChart({ days }: { days: DashboardDTO['salesByDay'] }) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 52 };
  const max = Math.max(...days.map((d) => d.revenue), 1);
  // round the axis max up to a tidy number
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const axisMax = Math.ceil(max / magnitude) * magnitude;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const slot = innerW / days.length;
  const barW = Math.min(28, slot * 0.62);
  const ticks = [0, 0.5, 1].map((f) => Math.round(axisMax * f));
  const total = days.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[480px]" role="img" aria-label={`Revenue for the last 14 days, ${formatMoney(total)} in total`}>
          {ticks.map((tick) => {
            const y = pad.top + innerH - (tick / axisMax) * innerH;
            return (
              <g key={tick}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {compactNaira(tick)}
                </text>
              </g>
            );
          })}
          {days.map((day, index) => {
            const h = (day.revenue / axisMax) * innerH;
            const x = pad.left + index * slot + (slot - barW) / 2;
            const y = pad.top + innerH - h;
            const isToday = index === days.length - 1;
            const date = new Date(`${day.date}T12:00:00Z`);
            return (
              <g key={day.date}>
                <title>{`${date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}: ${formatMoney(day.revenue)} from ${day.orders} order${day.orders === 1 ? '' : 's'}`}</title>
                <rect x={x} y={day.revenue > 0 ? y : pad.top + innerH - 2} width={barW} height={day.revenue > 0 ? Math.max(h, 2) : 2} rx="3" fill={isToday ? '#ffd23f' : '#d42073'} opacity={day.revenue > 0 ? 1 : 0.25} />
                {index % 2 === days.length % 2 || isToday ? (
                  <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748b">
                    {isToday ? 'Today' : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="px-1 pt-1 text-xs text-slate-500">Paid orders by day (Nigerian time). Hover a bar for the exact figure.</p>
    </div>
  );
}

export function DashboardView() {
  const { data, error, loading, reload } = useAdminQuery<DashboardDTO>('/api/admin/dashboard');

  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingBlock label="Loading dashboard…" />;

  const change = changeLabel(data.revenue.last30Days, data.revenue.previous30Days);
  const tiles: Array<{ label: string; value: string; sub: string; subClass: string; href?: string; alert?: boolean }> = [
    {
      label: 'Total revenue (all time)',
      value: formatMoney(data.revenue.allTime),
      sub: `${data.orders.paidAllTime} paid order${data.orders.paidAllTime === 1 ? '' : 's'}`,
      subClass: 'text-slate-500',
    },
    {
      label: 'Revenue, last 30 days',
      value: formatMoney(data.revenue.last30Days),
      sub: change.text,
      subClass: change.tone === 'up' ? 'text-emerald-700' : change.tone === 'down' ? 'text-rose-700' : 'text-slate-500',
    },
    { label: 'Revenue today', value: formatMoney(data.revenue.today), sub: `${formatMoney(data.revenue.last7Days)} in the last 7 days`, subClass: 'text-slate-500' },
    {
      label: 'Total orders',
      value: String(data.orders.total),
      sub: `${data.orders.awaitingFulfilment} to fulfil · ${data.orders.byStatus.PENDING} awaiting payment`,
      subClass: 'text-slate-500',
      href: '/admin/orders',
    },
    {
      label: 'Low-stock alerts',
      value: String(data.lowStockCount),
      sub: data.lowStockCount > 0 ? `Variants with ${data.lowStockThreshold} or fewer units` : 'All stock levels healthy',
      subClass: data.lowStockCount > 0 ? 'text-rose-700' : 'text-emerald-700',
      href: '/admin/products?status=low',
      alert: data.lowStockCount > 0,
    },
    { label: 'Customers', value: String(data.customers.total), sub: `${data.customers.newLast30Days} new in 30 days`, subClass: 'text-slate-500', href: '/admin/customers' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Sales, fulfilment and stock at a glance."
        actions={
          <button type="button" onClick={reload} className={adminButton.secondary}>
            Refresh
          </button>
        }
      />

      {data.orders.needsReview > 0 || data.orders.awaitingFulfilment > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {data.orders.awaitingFulfilment > 0 ? (
            <Link href="/admin/orders?status=PAID" className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 hover:border-brand-400">
              <span>
                <strong className="tabular-nums">{data.orders.awaitingFulfilment}</strong> paid order{data.orders.awaitingFulfilment === 1 ? '' : 's'} waiting to be packed or shipped
              </span>
              <span className="font-semibold">Fulfil</span>
            </Link>
          ) : null}
          {data.orders.needsReview > 0 ? (
            <Link href="/admin/orders?review=1" className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:border-amber-500">
              <span>
                <strong className="tabular-nums">{data.orders.needsReview}</strong> order{data.orders.needsReview === 1 ? '' : 's'} flagged for review (stock shortfall or payment mismatch)
              </span>
              <span className="font-semibold">Review</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
                {tile.label}
                {tile.alert ? <Pill tone="red">Alert</Pill> : null}
              </p>
              <p className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-2xl">{tile.value}</p>
              <p className={cn('mt-1 text-xs', tile.subClass)}>{tile.sub}</p>
            </>
          );
          const className = cn('min-w-0 rounded-xl border bg-white p-4', tile.alert ? 'border-rose-300' : 'border-slate-200');
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className={cn(className, 'transition hover:border-brand-400')}>
              {body}
            </Link>
          ) : (
            <div key={tile.label} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Revenue, last 14 days">
          <div className="p-4">
            <SalesChart days={data.salesByDay} />
          </div>
        </Panel>
        <Panel title="Best sellers, last 30 days">
          {data.topProducts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No paid orders in the last 30 days.</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {data.topProducts.map((product, index) => (
                <li key={product.productSlug} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-5 text-xs font-semibold text-slate-400 tabular-nums">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{product.productName}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{product.quantity} sold</span>
                  <span className="w-28 text-right font-semibold tabular-nums text-slate-900">{formatMoney(product.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Recent sales"
          actions={
            <Link href="/admin/orders" className="text-xs font-semibold text-brand-700 hover:underline">
              All orders
            </Link>
          }
        >
          {data.recentSales.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No paid orders yet. Sales appear here as soon as Paystack confirms a payment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Paid via</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentSales.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/admin/orders?open=${encodeURIComponent(order.orderNumber)}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                          {order.orderNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{formatRelative(order.paidAt ?? order.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">{order.customerName}</p>
                        <p className="text-xs text-slate-500">{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</p>
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-600">{order.paymentChannel?.replace(/_/g, ' ') ?? 'Paystack'}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={order.status} />
                          {order.needsReview ? <Pill tone="amber">Review</Pill> : null}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">{formatMoney(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title={data.lowStockCount > 0 ? `Low stock (${data.lowStockCount})` : 'Low stock'}
          actions={
            <Link href="/admin/inventory" className="text-xs font-semibold text-brand-700 hover:underline">
              Inventory
            </Link>
          }
        >
          {data.lowStock.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Every physical product has more than 5 units.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStock.map((item) => (
                <li key={item.variantId} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${item.productId}`} className="block truncate font-medium text-slate-800 hover:text-brand-700">
                      {item.productName}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {item.variantName} · <span className="font-mono">{item.sku}</span>
                    </p>
                  </div>
                  {item.stock <= 0 ? <Pill tone="red">Out</Pill> : <Pill tone="amber">{item.stock} left</Pill>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
