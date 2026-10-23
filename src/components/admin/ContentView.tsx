'use client';

/**
 * Website content: the homepage headline and button, an optional announcement bar,
 * and the wide banner picture. Saved to the database and shown on the storefront straight away.
 */
import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/site-content';
import { ProductImage } from '@/components/product/ProductImage';
import { PhotoUpload } from './PhotoUpload';
import { ErrorBanner, LoadingBlock, PageHeader, Panel, adminButton, adminInput, useAdminQuery } from './ui';

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ContentView() {
  const { data, error, loading, reload } = useAdminQuery<SiteContent>('/api/admin/content');
  const [form, setForm] = useState<SiteContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (loading || !form) return <LoadingBlock label="Loading website content…" />;

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setSaveError(null);
    setSaved(false);
    try {
      const result = await apiFetch<SiteContent>('/api/admin/content', { method: 'PUT', body: form });
      setForm(result);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <PageHeader
        title="Website content"
        description="Edit what customers see at the top of the homepage. Changes go live as soon as you save."
        actions={
          <Link href="/" target="_blank" className={adminButton.secondary}>
            View store
          </Link>
        }
      />

      {saved ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Saved. The storefront now shows these changes.
        </p>
      ) : null}
      {saveError ? <ErrorBanner message={saveError} /> : null}

      <Panel title="Homepage banner panel">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field id="c-eyebrow" label="Small heading above the title">
            <input id="c-eyebrow" className={adminInput} maxLength={60} value={form.heroEyebrow} onChange={(e) => set('heroEyebrow', e.target.value)} />
          </Field>
          <Field id="c-headline" label="Headline">
            <input id="c-headline" className={adminInput} maxLength={120} value={form.heroHeadline} onChange={(e) => set('heroHeadline', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="c-body" label="Supporting text">
              <textarea id="c-body" rows={2} maxLength={300} className={`${adminInput} h-auto py-2`} value={form.heroBody} onChange={(e) => set('heroBody', e.target.value)} />
            </Field>
          </div>
          <Field id="c-btn" label="Button label">
            <input id="c-btn" className={adminInput} maxLength={30} value={form.heroButtonLabel} onChange={(e) => set('heroButtonLabel', e.target.value)} />
          </Field>
          <Field id="c-btn-href" label="Button link" hint="For example /shop or /shop?category=smartphones">
            <input id="c-btn-href" className={adminInput} maxLength={300} value={form.heroButtonHref} onChange={(e) => set('heroButtonHref', e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Announcement bar">
        <div className="grid gap-4 p-5">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
            <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={form.announcementEnabled} onChange={(e) => set('announcementEnabled', e.target.checked)} />
            Show a one-line announcement above the header
          </label>
          <Field id="c-ann" label="Announcement text">
            <input id="c-ann" className={adminInput} maxLength={160} value={form.announcementText} onChange={(e) => set('announcementText', e.target.value)} placeholder="Free delivery on orders over ₦500,000" />
          </Field>
          <Field id="c-ann-href" label="Link (optional)">
            <input id="c-ann-href" className={adminInput} maxLength={300} value={form.announcementHref} onChange={(e) => set('announcementHref', e.target.value)} placeholder="/shop" />
          </Field>
        </div>
      </Panel>

      <Panel title="Wide banner picture">
        <div className="grid gap-4 p-5">
          <p className="text-sm text-slate-600">Shown under the top panel. Use a wide picture (about 1800 × 350). Leave empty to keep the built-in banner.</p>
          {form.bannerImage ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <ProductImage src={form.bannerImage} alt="Banner preview" className="w-full object-cover" />
            </div>
          ) : null}
          <div className="flex flex-wrap items-start gap-3">
            <PhotoUpload onUploaded={(url) => set('bannerImage', url)} label="Upload banner picture" />
            {form.bannerImage ? (
              <button type="button" onClick={() => set('bannerImage', '')} className={adminButton.danger}>
                Use built-in banner
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={adminButton.primary}>
          {busy ? <Spinner /> : null}
          Save changes
        </button>
        <button type="button" onClick={() => { setForm(DEFAULT_SITE_CONTENT); setSaved(false); }} className={adminButton.secondary}>
          Reset to defaults
        </button>
      </div>
    </form>
  );
}
