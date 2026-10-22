'use client';

/**
 * Create / edit a product with its variants. Prices are typed in Naira.
 * Stock for existing variants changes through the logged "Adjust stock" action.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronLeftIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { cn, slugify } from '@/lib/utils';
import type { Fulfillment } from '@/types';
import type { AdminCategoryDTO, AdminProductDetailDTO } from '@/types/admin';
import { StockAdjuster } from './StockAdjuster';
import { ErrorBanner, LoadingBlock, Panel, Pill, adminButton, adminInput, formatDateTime, useAdminQuery } from './ui';
import { ProductImage } from '@/components/product/ProductImage';

interface VariantRow {
  key: string;
  id?: string;
  sku: string;
  values: string[]; // one value per option name
  price: string; // Naira
  compareAtPrice: string; // Naira
  stock: number; // existing variants: live stock; new variants: opening stock
  image: string;
  isActive: boolean;
}

interface FormState {
  name: string;
  slug: string;
  brand: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  images: string[];
  specs: Array<{ label: string; value: string }>;
  tags: string;
  fulfillment: Fulfillment;
  warrantyMonths: string;
  featured: boolean;
  isActive: boolean;
  optionNames: string[];
  variants: VariantRow[];
  defaultKey: string;
}

let keyCounter = 0;
const newKey = () => `row-${(keyCounter += 1)}`;

function emptyVariant(optionCount: number): VariantRow {
  return { key: newKey(), sku: '', values: Array(optionCount).fill(''), price: '', compareAtPrice: '', stock: 0, image: '', isActive: true };
}

function fromProduct(product: AdminProductDetailDTO): FormState {
  const optionNames: string[] = [];
  for (const variant of product.variants) {
    for (const option of variant.options) if (!optionNames.includes(option.name)) optionNames.push(option.name);
  }
  const variants = product.variants.map((variant) => ({
    key: newKey(),
    id: variant.id,
    sku: variant.sku,
    values: optionNames.map((name) => variant.options.find((o) => o.name === name)?.value ?? ''),
    price: String(variant.price / 100),
    compareAtPrice: variant.compareAtPrice ? String(variant.compareAtPrice / 100) : '',
    stock: variant.stock,
    image: variant.image ?? '',
    isActive: variant.isActive,
  }));
  const defaultIndex = Math.max(0, product.variants.findIndex((v) => v.isDefault));
  return {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    categoryId: product.categoryId,
    shortDescription: product.shortDescription,
    description: product.description,
    images: product.images,
    specs: product.specs,
    tags: product.tags.join(', '),
    fulfillment: product.fulfillment,
    warrantyMonths: String(product.warrantyMonths),
    featured: product.featured,
    isActive: product.isActive,
    optionNames,
    variants,
    defaultKey: variants[defaultIndex]?.key ?? '',
  };
}

function blankForm(): FormState {
  const first = emptyVariant(0);
  return {
    name: '',
    slug: '',
    brand: 'ElectroCore',
    categoryId: '',
    shortDescription: '',
    description: '',
    images: [],
    specs: [],
    tags: '',
    fulfillment: 'PHYSICAL',
    warrantyMonths: '12',
    featured: false,
    isActive: true,
    optionNames: [],
    variants: [first],
    defaultKey: first.key,
  };
}

function Field({ id, label, hint, children, className }: { id: string; label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ProductFormLoader({ productId, justCreated = false }: { productId: string; justCreated?: boolean }) {
  const { data, error, loading, reload } = useAdminQuery<AdminProductDetailDTO>(`/api/admin/products/${productId}`);
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingBlock label="Loading product…" />;
  return <ProductForm product={data} initialMessage={justCreated ? 'Product created. It is live in the store if “On sale” is ticked.' : null} />;
}

export function ProductForm({ product, initialMessage = null }: { product?: AdminProductDetailDTO; initialMessage?: string | null }) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [form, setForm] = useState<FormState>(() => (product ? fromProduct(product) : blankForm()));
  const [imageDraft, setImageDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(initialMessage);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const { data: categories } = useAdminQuery<AdminCategoryDTO[]>('/api/admin/categories');

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(null);
  };
  const setVariant = (key: string, patch: Partial<VariantRow>) => {
    setForm((f) => ({ ...f, variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));
    setSaved(null);
  };

  const slugPreview = useMemo(() => form.slug || slugify(form.name), [form.slug, form.name]);

  function addOption() {
    if (form.optionNames.length >= 3) return;
    setForm((f) => ({ ...f, optionNames: [...f.optionNames, ''], variants: f.variants.map((v) => ({ ...v, values: [...v.values, ''] })) }));
  }

  function removeOption(index: number) {
    setForm((f) => ({
      ...f,
      optionNames: f.optionNames.filter((_, i) => i !== index),
      variants: f.variants.map((v) => ({ ...v, values: v.values.filter((_, i) => i !== index) })),
    }));
  }

  function addVariant() {
    setForm((f) => {
      const row = emptyVariant(f.optionNames.length);
      const base = f.variants[0];
      if (base) {
        row.price = base.price;
        row.sku = base.sku ? `${base.sku}-${f.variants.length + 1}` : '';
      }
      return { ...f, variants: [...f.variants, row] };
    });
  }

  function removeVariant(key: string) {
    setForm((f) => {
      const variants = f.variants.filter((v) => v.key !== key);
      return { ...f, variants, defaultKey: f.defaultKey === key ? variants[0]?.key ?? '' : f.defaultKey };
    });
  }

  function addImage() {
    const url = imageDraft.trim();
    if (!url) return;
    set('images', [...form.images, url]);
    setImageDraft('');
  }

  function moveImage(index: number, delta: number) {
    const next = [...form.images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('images', next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(null);

    const optionNames = form.optionNames.map((n) => n.trim());
    if (optionNames.some((n) => !n)) {
      setError('Give every option a name (for example Color or Storage), or remove it.');
      setSaving(false);
      return;
    }

    const body = {
      name: form.name,
      slug: form.slug,
      brand: form.brand,
      categoryId: form.categoryId,
      shortDescription: form.shortDescription,
      description: form.description,
      images: form.images,
      specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
      tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      fulfillment: form.fulfillment,
      warrantyMonths: Number(form.warrantyMonths || 0),
      featured: form.featured,
      isActive: form.isActive,
      variants: form.variants.map((v) => {
        const options = optionNames.map((name, i) => ({ name, value: v.values[i]?.trim() ?? '' })).filter((o) => o.value);
        return {
          id: v.id,
          sku: v.sku,
          name: options.map((o) => o.value).join(' / '),
          options,
          price: v.price === '' ? -1 : Number(v.price),
          compareAtPrice: v.compareAtPrice === '' ? null : Number(v.compareAtPrice),
          stock: v.id ? 0 : v.stock,
          image: v.image || null,
          isDefault: v.key === form.defaultKey,
          isActive: v.isActive,
        };
      }),
    };

    try {
      const result = isEdit && product
        ? await apiFetch<AdminProductDetailDTO>(`/api/admin/products/${product.id}`, { method: 'PUT', body })
        : await apiFetch<AdminProductDetailDTO>('/api/admin/products', { method: 'POST', body });
      if (isEdit) {
        setForm(fromProduct(result));
        setSaved('Changes saved. The store shows them immediately.');
      } else {
        router.push(`/admin/products/${result.id}?created=1`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  }

  const fromSupplier = product && product.source !== 'manual';

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ChevronLeftIcon size={16} />
          Products
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isEdit ? form.name || 'Edit product' : 'Add product'}</h1>
            {isEdit ? form.isActive ? <Pill tone="green">On sale</Pill> : <Pill tone="slate">Hidden</Pill> : null}
          </div>
          <div className="flex gap-2">
            {isEdit && product ? (
              <Link href={`/product/${product.slug}`} target="_blank" className={adminButton.secondary}>
                View in store
              </Link>
            ) : null}
            <button type="submit" disabled={saving} className={adminButton.primary}>
              {saving ? <Spinner /> : null}
              {isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      </div>

      {fromSupplier && product ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This product comes from the <strong>{product.source}</strong> supplier feed
          {product.lastSyncedAt ? ` (last synced ${formatDateTime(product.lastSyncedAt)})` : ''}. The next supplier sync will overwrite text, prices and stock
          you change here. Edit it at the supplier, or hide this one and add your own version.
        </p>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {saved ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{saved}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Details">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field id="p-name" label="Product name" className="sm:col-span-2">
                <input id="p-name" required value={form.name} onChange={(e) => set('name', e.target.value)} className={adminInput} />
              </Field>
              <Field id="p-brand" label="Brand">
                <input id="p-brand" required value={form.brand} onChange={(e) => set('brand', e.target.value)} className={adminInput} />
              </Field>
              <Field id="p-category" label="Category">
                <select id="p-category" required value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={adminInput}>
                  <option value="">Choose a category</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="p-short" label="Short description" hint="One or two sentences shown on product cards." className="sm:col-span-2">
                <textarea id="p-short" rows={2} maxLength={300} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} className={cn(adminInput, 'h-auto py-2')} />
              </Field>
              <Field id="p-desc" label="Full description" className="sm:col-span-2">
                <textarea id="p-desc" rows={6} maxLength={8000} value={form.description} onChange={(e) => set('description', e.target.value)} className={cn(adminInput, 'h-auto py-2')} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Variants & pricing"
            actions={
              form.optionNames.length < 3 ? (
                <button type="button" onClick={addOption} className="text-xs font-semibold text-brand-700 hover:underline">
                  Add option (e.g. Color)
                </button>
              ) : null
            }
          >
            <div className="flex flex-col gap-4 p-5">
              {form.optionNames.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {form.optionNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <label htmlFor={`opt-${index}`} className="sr-only">Option {index + 1} name</label>
                      <input
                        id={`opt-${index}`}
                        value={name}
                        placeholder={['Color', 'Storage', 'Size'][index] ?? 'Option'}
                        onChange={(e) => set('optionNames', form.optionNames.map((n, i) => (i === index ? e.target.value : n)))}
                        className={cn(adminInput, 'w-36')}
                      />
                      <button type="button" onClick={() => removeOption(index)} className="grid h-10 w-9 place-items-center text-slate-400 hover:text-rose-600" aria-label={`Remove option ${name || index + 1}`}>
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Single version. Add an option if this product comes in colours, sizes or configurations.</p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="pb-2 pr-2 font-medium">Default</th>
                      {form.optionNames.map((name, i) => (
                        <th key={i} className="pb-2 pr-2 font-medium">{name || `Option ${i + 1}`}</th>
                      ))}
                      <th className="pb-2 pr-2 font-medium">SKU</th>
                      <th className="pb-2 pr-2 font-medium">Price (₦)</th>
                      <th className="pb-2 pr-2 font-medium">Was (₦)</th>
                      <th className="pb-2 pr-2 font-medium">Stock</th>
                      <th className="pb-2 pr-2 font-medium">On sale</th>
                      <th className="pb-2 font-medium"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {form.variants.map((variant, rowIndex) => (
                      <tr key={variant.key} className={cn(!variant.isActive && 'opacity-60')}>
                        <td className="py-1.5 pr-2">
                          <input
                            type="radio"
                            name="default-variant"
                            checked={form.defaultKey === variant.key}
                            onChange={() => set('defaultKey', variant.key)}
                            className="mt-3 h-4 w-4 accent-brand-600"
                            aria-label={`Make row ${rowIndex + 1} the default`}
                          />
                        </td>
                        {form.optionNames.map((name, i) => (
                          <td key={i} className="py-1.5 pr-2">
                            <input
                              aria-label={`${name || `Option ${i + 1}`} for row ${rowIndex + 1}`}
                              value={variant.values[i] ?? ''}
                              onChange={(e) => setVariant(variant.key, { values: variant.values.map((v, j) => (j === i ? e.target.value : v)) })}
                              className={cn(adminInput, 'w-32')}
                            />
                          </td>
                        ))}
                        <td className="py-1.5 pr-2">
                          <input aria-label={`SKU for row ${rowIndex + 1}`} value={variant.sku} onChange={(e) => setVariant(variant.key, { sku: e.target.value.toUpperCase() })} className={cn(adminInput, 'w-40 font-mono text-xs')} />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input aria-label={`Price for row ${rowIndex + 1}`} type="number" inputMode="decimal" min={0} step="0.01" value={variant.price} onChange={(e) => setVariant(variant.key, { price: e.target.value })} className={cn(adminInput, 'w-32 tabular-nums')} />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input aria-label={`Was price for row ${rowIndex + 1}`} type="number" inputMode="decimal" min={0} step="0.01" value={variant.compareAtPrice} onChange={(e) => setVariant(variant.key, { compareAtPrice: e.target.value })} placeholder="—" className={cn(adminInput, 'w-28 tabular-nums')} />
                        </td>
                        <td className="py-1.5 pr-2">
                          {variant.id ? (
                            <div className="flex h-10 items-center gap-2">
                              <span className="w-10 font-semibold tabular-nums text-slate-900">{variant.stock}</span>
                              <button type="button" onClick={() => setAdjusting(variant.key)} className="text-xs font-semibold text-brand-700 hover:underline">
                                Adjust
                              </button>
                            </div>
                          ) : (
                            <input aria-label={`Opening stock for row ${rowIndex + 1}`} type="number" inputMode="numeric" min={0} value={variant.stock} onChange={(e) => setVariant(variant.key, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={cn(adminInput, 'w-20 tabular-nums')} />
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          <input type="checkbox" checked={variant.isActive} onChange={(e) => setVariant(variant.key, { isActive: e.target.checked })} className="mt-3 h-4 w-4 accent-brand-600" aria-label={`Row ${rowIndex + 1} on sale`} />
                        </td>
                        <td className="py-1.5">
                          {form.variants.length > 1 ? (
                            <button type="button" onClick={() => removeVariant(variant.key)} className="grid h-10 w-9 place-items-center text-slate-400 hover:text-rose-600" aria-label={`Remove row ${rowIndex + 1}`}>
                              <TrashIcon size={16} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {adjusting ? (() => {
                const row = form.variants.find((v) => v.key === adjusting);
                if (!row?.id) return null;
                return (
                  <StockAdjuster
                    variantId={row.id}
                    label={row.values.filter(Boolean).join(' / ') || row.sku}
                    currentStock={row.stock}
                    onCancel={() => setAdjusting(null)}
                    onDone={(stock) => {
                      setForm((f) => ({ ...f, variants: f.variants.map((v) => (v.key === adjusting ? { ...v, stock } : v)) }));
                      setAdjusting(null);
                      setSaved('Stock updated and logged.');
                    }}
                  />
                );
              })() : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={addVariant} className={adminButton.secondary}>
                  <PlusIcon size={16} />
                  Add variant
                </button>
                <p className="text-xs text-slate-500">Removing a saved variant hides it; past orders keep their records.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Specifications">
            <div className="flex flex-col gap-2 p-5">
              {form.specs.map((spec, index) => (
                <div key={index} className="flex gap-2">
                  <input aria-label={`Specification ${index + 1} label`} value={spec.label} placeholder="Label, e.g. Battery" onChange={(e) => set('specs', form.specs.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)))} className={cn(adminInput, 'w-44 shrink-0')} />
                  <input aria-label={`Specification ${index + 1} value`} value={spec.value} placeholder="Value, e.g. 5,000mAh" onChange={(e) => set('specs', form.specs.map((s, i) => (i === index ? { ...s, value: e.target.value } : s)))} className={adminInput} />
                  <button type="button" onClick={() => set('specs', form.specs.filter((_, i) => i !== index))} className="grid h-10 w-9 shrink-0 place-items-center text-slate-400 hover:text-rose-600" aria-label={`Remove specification ${index + 1}`}>
                    <TrashIcon size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])} className="self-start text-sm font-semibold text-brand-700 hover:underline">
                Add specification
              </button>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Visibility">
            <div className="flex flex-col gap-3 p-5 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium text-slate-900">On sale</span>
                  <span className="block text-xs text-slate-500">Hidden products can’t be found or bought.</span>
                </span>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-5 w-5 accent-brand-600" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium text-slate-900">Featured on homepage</span>
                  <span className="block text-xs text-slate-500">Appears under “Popular right now”.</span>
                </span>
                <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="h-5 w-5 accent-brand-600" />
              </label>
            </div>
          </Panel>

          <Panel title="Fulfilment">
            <div className="grid gap-4 p-5">
              <Field id="p-fulfil" label="How it reaches the customer">
                <select id="p-fulfil" value={form.fulfillment} onChange={(e) => set('fulfillment', e.target.value as Fulfillment)} className={adminInput}>
                  <option value="PHYSICAL">Delivered (physical product)</option>
                  <option value="DIGITAL">Emailed licence or download</option>
                  <option value="SERVICE">Service booking</option>
                </select>
              </Field>
              <Field id="p-warranty" label="Warranty (months)" hint="0 hides the warranty line on the product page.">
                <input id="p-warranty" type="number" min={0} max={240} value={form.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} className={adminInput} />
              </Field>
            </div>
          </Panel>

          <Panel title="Images">
            <div className="flex flex-col gap-3 p-5">
              {form.images.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2">
                  {form.images.map((image, index) => (
                    <li key={`${image}-${index}`} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <ProductImage src={image} alt="" className="aspect-square w-full object-contain" />
                      {index === 0 ? <span className="absolute left-1 top-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">Main</span> : null}
                      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 px-1 py-0.5 text-xs">
                        <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="px-1 font-semibold text-slate-600 disabled:opacity-30" aria-label="Move image earlier">‹</button>
                        <button type="button" onClick={() => set('images', form.images.filter((_, i) => i !== index))} className="px-1 font-semibold text-rose-600" aria-label="Remove image">Remove</button>
                        <button type="button" onClick={() => moveImage(index, 1)} disabled={index === form.images.length - 1} className="px-1 font-semibold text-slate-600 disabled:opacity-30" aria-label="Move image later">›</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No images yet. The store shows a neutral placeholder until you add one.</p>
              )}
              <div className="flex gap-2">
                <label htmlFor="p-image" className="sr-only">Image URL</label>
                <input
                  id="p-image"
                  value={imageDraft}
                  onChange={(e) => setImageDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                  placeholder="https://… or /products/file.svg"
                  className={adminInput}
                />
                <button type="button" onClick={addImage} className={adminButton.secondary}>
                  Add
                </button>
              </div>
              <p className="text-xs text-slate-500">Paste an https:// link to a hosted photo, or a path for a file you placed in the project’s public folder.</p>
            </div>
          </Panel>

          <Panel title="Search & URL">
            <div className="grid gap-4 p-5">
              <Field id="p-tags" label="Search tags" hint="Comma separated, e.g. laptop, business, windows">
                <input id="p-tags" value={form.tags} onChange={(e) => set('tags', e.target.value)} className={adminInput} />
              </Field>
              <Field id="p-slug" label="URL slug" hint={`Store link: /product/${slugPreview || '…'}`}>
                <input id="p-slug" value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder={slugify(form.name)} className={cn(adminInput, 'font-mono text-xs')} />
              </Field>
            </div>
          </Panel>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-5">
        <button type="submit" disabled={saving} className={adminButton.primary}>
          {saving ? <Spinner /> : null}
          {isEdit ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  );
}
