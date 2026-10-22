'use client';

import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import type { SystemStatusDTO } from '@/types/admin';
import { ErrorBanner, LoadingBlock, PageHeader, Panel, Pill, adminButton, formatDateTime, useAdminQuery } from './ui';

interface SyncReport {
  supplier: string;
  runId: string;
  categories: number;
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  variantsDeactivated: number;
  productsHidden: number;
  stockChanges: number;
  skipped: Array<{ externalId: string; reason: string }>;
}

const MODE_TEXT: Record<SystemStatusDTO['paystack']['mode'], { label: string; tone: 'green' | 'amber' | 'red' | 'blue'; body: string }> = {
  live: { label: 'Live', tone: 'green', body: 'Real payments are being taken.' },
  test: { label: 'Test mode', tone: 'amber', body: 'Payments use Paystack test keys. Switch to sk_live_ keys in .env before launch.' },
  mock: { label: 'Mock mode', tone: 'blue', body: 'Payments are simulated (PAYSTACK_MOCK_MODE). This only works outside production.' },
  missing: { label: 'Not configured', tone: 'red', body: 'Add PAYSTACK_SECRET_KEY to .env. Customers cannot pay until you do.' },
};

export function SettingsView() {
  const { data, error, loading, reload } = useAdminQuery<SystemStatusDTO>('/api/admin/system');
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function runSync() {
    setSyncing(true);
    setSyncError(null);
    setReport(null);
    try {
      setReport(await apiFetch<SyncReport>('/api/admin/sync', { method: 'POST' }));
      reload();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  async function copyWebhook(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingBlock label="Loading settings…" />;

  const mode = MODE_TEXT[data.paystack.mode];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Payment and supplier status. Values come from the server’s .env file; change them there and restart." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Payments (Paystack)">
          <div className="flex flex-col gap-4 p-5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-slate-600">{mode.body}</p>
              <Pill tone={mode.tone}>{mode.label}</Pill>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Webhook URL (paste into Paystack → Settings → API Keys & Webhooks)</p>
              <div className="mt-1 flex gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">{data.webhookUrl}</code>
                <button type="button" onClick={() => void copyWebhook(data.webhookUrl)} className={adminButton.secondary}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">Store currency</dt>
                <dd className="font-semibold text-slate-900">{data.storeCurrency}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">Rate used for USD</dt>
                <dd className="font-semibold tabular-nums text-slate-900">₦{data.ngnPerUsd.toLocaleString('en-NG')} = $1</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title="Supplier catalog sync">
          <div className="flex flex-col gap-4 p-5 text-sm">
            <p className="text-slate-600">
              Pulls products, prices and stock from the <strong>{data.supplierProvider}</strong> supplier feed. Products you added here are never touched.
            </p>
            <ul className="flex flex-wrap gap-2">
              {data.productsBySource.map((row) => (
                <li key={row.source}>
                  <Pill tone="slate">
                    {row.source === 'manual' ? 'Added here' : row.source}: {row.count}
                  </Pill>
                </li>
              ))}
            </ul>
            <div>
              <button type="button" onClick={() => void runSync()} disabled={syncing} className={adminButton.primary}>
                {syncing ? <Spinner /> : null}
                {syncing ? 'Syncing…' : 'Run sync now'}
              </button>
            </div>
            {syncError ? <ErrorBanner message={syncError} /> : null}
            {report ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                <p className="font-semibold">Sync finished</p>
                <p className="mt-1">
                  {report.productsCreated} new and {report.productsUpdated} updated products, {report.stockChanges} stock change{report.stockChanges === 1 ? '' : 's'} logged
                  {report.variantsDeactivated > 0 ? `, ${report.variantsDeactivated} discontinued variant${report.variantsDeactivated === 1 ? '' : 's'} hidden` : ''}
                  {report.productsHidden > 0 ? `, ${report.productsHidden} product${report.productsHidden === 1 ? '' : 's'} no longer in the catalog hidden` : ''}.
                </p>
                {report.skipped.length > 0 ? <p className="mt-1 text-amber-800">{report.skipped.length} skipped: {report.skipped[0].reason}</p> : null}
                <p className="mt-1 font-mono text-xs text-emerald-700">{report.runId}</p>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel title="Recent Paystack webhooks">
        {data.recentWebhooks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No webhooks received yet. They arrive here once the webhook URL is set in Paystack.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Received</th>
                  <th className="px-3 py-2.5 font-medium">Event</th>
                  <th className="px-3 py-2.5 font-medium">Reference</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentWebhooks.map((hook) => (
                  <tr key={hook.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDateTime(hook.createdAt)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{hook.event}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{hook.reference ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {!hook.signatureValid ? (
                        <Pill tone="red">Bad signature</Pill>
                      ) : hook.error ? (
                        <span className="text-xs text-rose-700">{hook.error}</span>
                      ) : hook.processedAt ? (
                        <Pill tone="green">Processed</Pill>
                      ) : (
                        <Pill tone="slate">Received</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Store address">
        <p className="px-5 py-4 text-sm text-slate-600">
          Payment callbacks and links use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{data.appUrl}</code>. Set NEXT_PUBLIC_APP_URL to your live domain before launch.
        </p>
      </Panel>
    </div>
  );
}
