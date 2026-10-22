'use client';

import { useState, type FormEvent } from 'react';
import { CATEGORY_ICONS, ChipIcon, PlusIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { cn, slugify } from '@/lib/utils';
import type { AdminCategoryDTO } from '@/types/admin';
import { ErrorBanner, LoadingBlock, PageHeader, Panel, adminButton, adminInput, useAdminQuery } from './ui';

const ICON_LABELS: Record<string, string> = {
  laptop: 'Laptop',
  phone: 'Phone',
  chip: 'Chip',
  keyboard: 'Keyboard',
  headphones: 'Headphones',
  bolt: 'Power',
  wifi: 'Wi-Fi',
  code: 'Code',
  wrench: 'Wrench',
};

interface Draft {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: string;
}

const EMPTY: Draft = { name: '', slug: '', description: '', icon: 'chip', sortOrder: '100' };

export function CategoriesView() {
  const { data, setData, error, loading, reload } = useAdminQuery<AdminCategoryDTO[]>('/api/admin/categories');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function edit(category?: AdminCategoryDTO) {
    setFormError(null);
    setMessage(null);
    setDraft(
      category
        ? { id: category.id, name: category.name, slug: category.slug, description: category.description, icon: category.icon ?? 'chip', sortOrder: String(category.sortOrder) }
        : { ...EMPTY },
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setFormError(null);
    try {
      const body = { name: draft.name, slug: draft.slug, description: draft.description, icon: draft.icon, sortOrder: Number(draft.sortOrder || 0) };
      const list = draft.id
        ? await apiFetch<AdminCategoryDTO[]>(`/api/admin/categories/${draft.id}`, { method: 'PUT', body })
        : await apiFetch<AdminCategoryDTO[]>('/api/admin/categories', { method: 'POST', body });
      setData(list);
      setMessage(draft.id ? `Saved “${draft.name}”.` : `Created “${draft.name}”.`);
      setDraft(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the category.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: AdminCategoryDTO) {
    setMessage(null);
    setFormError(null);
    try {
      setData(await apiFetch<AdminCategoryDTO[]>(`/api/admin/categories/${category.id}`, { method: 'DELETE' }));
      setMessage(`Deleted “${category.name}”.`);
      if (draft?.id === category.id) setDraft(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not delete the category.');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Categories"
        description="Groups shown in the shop filters, homepage and footer. Lower sort numbers appear first."
        actions={
          <button type="button" onClick={() => edit()} className={adminButton.primary}>
            <PlusIcon size={16} />
            Add category
          </button>
        }
      />

      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
      {formError && !draft ? <ErrorBanner message={formError} /> : null}

      {draft ? (
        <Panel title={draft.id ? `Edit ${draft.name || 'category'}` : 'New category'}>
          <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
              <input id="c-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={adminInput} />
            </div>
            <div>
              <label htmlFor="c-slug" className="mb-1.5 block text-sm font-medium text-slate-700">URL slug</label>
              <input id="c-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} placeholder={slugify(draft.name)} className={cn(adminInput, 'font-mono text-xs')} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-desc" className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
              <input id="c-desc" required value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={adminInput} />
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium text-slate-700">Icon</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ICON_LABELS).map(([key, label]) => {
                  const Icon = CATEGORY_ICONS[key] ?? ChipIcon;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={draft.icon === key}
                      onClick={() => setDraft({ ...draft, icon: key })}
                      className={cn(
                        'flex h-10 items-center gap-2 rounded-lg border px-3 text-sm',
                        draft.icon === key ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-600 hover:border-slate-400',
                      )}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div>
              <label htmlFor="c-sort" className="mb-1.5 block text-sm font-medium text-slate-700">Sort order</label>
              <input id="c-sort" type="number" min={0} max={1000} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} className={adminInput} />
            </div>
            {formError ? (
              <div className="sm:col-span-2">
                <ErrorBanner message={formError} />
              </div>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={busy} className={adminButton.primary}>
                {busy ? <Spinner /> : null}
                {draft.id ? 'Save category' : 'Create category'}
              </button>
              <button type="button" onClick={() => setDraft(null)} className={adminButton.secondary}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel>
        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <LoadingBlock />
        ) : (
          <ul className="divide-y divide-slate-100">
            {(data ?? []).map((category) => {
              const Icon = CATEGORY_ICONS[category.icon ?? ''] ?? ChipIcon;
              return (
                <li key={category.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{category.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      /shop?category={category.slug} · {category.productCount} product{category.productCount === 1 ? '' : 's'} · sort {category.sortOrder}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => edit(category)} className="font-semibold text-brand-700 hover:underline">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(category)}
                      disabled={category.productCount > 0}
                      title={category.productCount > 0 ? 'Move or hide its products first' : undefined}
                      className="font-semibold text-rose-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
