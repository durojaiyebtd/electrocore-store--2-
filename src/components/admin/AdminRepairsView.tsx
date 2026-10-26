'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { formatMoney } from '@/lib/currency';
import { REPAIR_STATUSES, REPAIR_STATUS_LABEL, type RepairStatusValue } from '@/lib/repair-constants';
import type { RepairListItemDTO } from '@/types/repair';
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel, Pill, SearchField, Tabs, formatRelative, useAdminQuery } from './ui';

interface ListResult { items: RepairListItemDTO[]; total: number; page: number; pageSize: number; counts: Record<string, number> }

export function repairTone(status: RepairStatusValue): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  if (status === 'COMPLETED' || status === 'READY') return 'green';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'slate';
  if (status === 'SUBMITTED' || status === 'NEGOTIATING') return 'amber';
  return 'blue';
}

export function AdminRepairsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? 'all';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (q) params.set('q', q);
  params.set('page', String(page));
  const { data, error, loading, reload } = useAdminQuery<ListResult>(`/api/admin/repairs?${params.toString()}`);

  const update = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    if (!('page' in changes)) next.delete('page');
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [router, pathname, searchParams]);

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const tabs = [{ value: 'all', label: 'All', count: total }, ...REPAIR_STATUSES.map((s) => ({ value: s as string, label: REPAIR_STATUS_LABEL[s], count: data?.counts[s] ?? 0 }))];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Repair requests" description="Customer repair requests with photos, quotations, negotiations, appointments and payments." actions={<Link href="/admin/repairers" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">Manage repairers</Link>} />
      <Panel>
        <div className="px-4 pt-2"><Tabs label="Repair status" value={status} options={tabs} onChange={(v) => update({ status: v === 'all' ? null : v })} /></div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3"><SearchField id="repair-search" value={q} onChange={(v) => update({ q: v || null })} placeholder="Reference, name, email, phone or device" /></div>
        {error ? <div className="p-4"><ErrorBanner message={error} onRetry={reload} /></div>
          : loading && !data ? <LoadingBlock />
          : !data || data.items.length === 0 ? <EmptyState title={q ? 'No requests match your search' : 'No repair requests yet'} body={q ? 'Check the spelling, or search by reference (RR-…).' : 'Requests appear here when customers submit the repair form.'} />
          : (<>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">Request</th><th className="px-3 py-2.5 font-medium">Customer</th><th className="px-3 py-2.5 font-medium">Device and fault</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Repairer</th><th className="px-4 py-2.5 text-right font-medium">Price / paid</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><Link href={`/admin/repairs/${r.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline" aria-label={`Open repair request ${r.reference}`}>{r.reference}</Link><p className="text-xs text-slate-500">{formatRelative(r.createdAt)} · {r.photoCount} photo{r.photoCount === 1 ? '' : 's'}</p></td>
                      <td className="px-3 py-3"><p className="font-medium text-slate-800">{r.name}</p><p className="text-xs text-slate-500">{r.phone}</p></td>
                      <td className="px-3 py-3"><p className="font-medium text-slate-800">{r.deviceLabel}</p><p className="max-w-[16rem] truncate text-xs text-slate-500">{r.faultSummary}</p></td>
                      <td className="px-3 py-3"><div className="flex flex-wrap gap-1.5"><Pill tone={repairTone(r.status)}>{REPAIR_STATUS_LABEL[r.status]}</Pill>{r.needsReply ? <Pill tone="red">Needs reply</Pill> : null}</div></td>
                      <td className="px-3 py-3 text-slate-600">{r.repairerName ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.agreedAmount != null ? <><p className="font-medium">{formatMoney(r.agreedAmount)}</p><p className="text-xs text-slate-500">paid {formatMoney(r.paidAmount)}</p></> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={Math.max(1, Math.ceil(data.total / data.pageSize))} total={data.total} onPage={(p) => update({ page: String(p) })} />
          </>)}
      </Panel>
    </div>
  );
}
