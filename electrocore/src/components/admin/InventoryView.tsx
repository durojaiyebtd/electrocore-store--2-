'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { InventoryLogDTO, LowStockDTO, Paginated } from '@/types/admin';
import { StockAdjuster } from './StockAdjuster';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, adminInput, formatDateTime, useAdminQuery } from './ui';

const REASON_LABEL: Record<string, string> = {
  INITIAL_STOCK: 'Opening stock',
  SUPPLIER_SYNC: 'Supplier sync',
  SALE: 'Sale',
  RESTOCK: 'Restock',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Return',
  OVERSOLD: 'Oversold',
};

export function InventoryView() {
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const lowStock = useAdminQuery<LowStockDTO[]>('/api/admin/inventory/low-stock');
  const logsUrl = `/api/admin/inventory?page=${page}${reason ? `&reason=${reason}` : ''}`;
  const logs = useAdminQuery<Paginated<InventoryLogDTO>>(logsUrl);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory" description="Restock low items and see every stock movement: sales, returns, supplier syncs and manual changes." />

      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}

      <Panel title="Low and out of stock (5 or fewer)">
        {lowStock.error ? (
          <div className="p-4">
            <ErrorBanner message={lowStock.error} onRetry={lowStock.reload} />
          </div>
        ) : lowStock.loading && !lowStock.data ? (
          <LoadingBlock />
        ) : !lowStock.data || lowStock.data.length === 0 ? (
          <EmptyState title="Stock levels are healthy" body="Every physical product on sale has more than 5 units." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {lowStock.data.map((item) => (
              <li key={item.variantId} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/admin/products/${item.productId}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {item.productName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {item.variantName} · <span className="font-mono">{item.sku}</span>
                    </p>
                  </div>
                  {item.stock <= 0 ? <Pill tone="red">Out of stock</Pill> : <Pill tone="amber">{item.stock} left</Pill>}
                  <button
                    type="button"
                    onClick={() => {
                      setAdjusting(item.variantId);
                      setMessage(null);
                    }}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    Restock
                  </button>
                </div>
                {adjusting === item.variantId ? (
                  <div className="mt-3">
                    <StockAdjuster
                      variantId={item.variantId}
                      label={`${item.productName} (${item.variantName})`}
                      currentStock={item.stock}
                      onCancel={() => setAdjusting(null)}
                      onDone={(stock) => {
                        setAdjusting(null);
                        setMessage(`${item.productName} (${item.variantName}) now has ${stock} in stock.`);
                        lowStock.reload();
                        logs.reload();
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Stock movements"
        actions={
          <div className="w-48">
            <label htmlFor="log-reason" className="sr-only">Filter by reason</label>
            <select
              id="log-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setPage(1);
              }}
              className={cn(adminInput, 'h-8 text-xs')}
            >
              <option value="">All movements</option>
              {Object.entries(REASON_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {logs.error ? (
          <div className="p-4">
            <ErrorBanner message={logs.error} onRetry={logs.reload} />
          </div>
        ) : logs.loading && !logs.data ? (
          <LoadingBlock />
        ) : !logs.data || logs.data.items.length === 0 ? (
          <EmptyState title="No stock movements" body="Changes appear here as soon as stock is sold, synced or adjusted." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 font-medium">Reason</th>
                    <th className="px-3 py-2.5 text-right font-medium">Change</th>
                    <th className="px-3 py-2.5 text-right font-medium">Balance</th>
                    <th className="px-4 py-2.5 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.data.items.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDateTime(log.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{log.productName}</p>
                        <p className="text-xs text-slate-500">
                          {log.variantName} · <span className="font-mono">{log.sku}</span>
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill tone={log.reason === 'SALE' ? 'blue' : log.reason === 'OVERSOLD' ? 'red' : log.change > 0 ? 'green' : 'slate'}>
                          {REASON_LABEL[log.reason] ?? log.reason}
                        </Pill>
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', log.change > 0 ? 'text-emerald-700' : 'text-rose-700')}>
                        {log.change > 0 ? `+${log.change}` : log.change}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{log.balanceAfter}</td>
                      <td className="max-w-xs px-4 py-2.5 text-xs text-slate-500">
                        {log.reference ? (
                          log.reference.startsWith('MES-') ? (
                            <Link href={`/admin/orders/${log.reference}`} className="font-mono text-brand-700 hover:underline">
                              {log.reference}
                            </Link>
                          ) : (
                            <span className="font-mono">{log.reference}</span>
                          )
                        ) : null}
                        {log.note ? <p>{log.note}</p> : null}
                        {log.actor ? <p className="text-slate-400">by {log.actor}</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={logs.data.page} totalPages={logs.data.totalPages} total={logs.data.total} onPage={setPage} />
          </>
        )}
      </Panel>
    </div>
  );
}
