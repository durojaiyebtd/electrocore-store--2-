'use client';

/**
 * Quick create / edit product modal: Title, Category, Price (₦), Stock count, Image URL,
 * Tech specs, Description and visibility. Saves through:
 *   POST /api/admin/products/quick        (create)
 *   PUT  /api/admin/products/:id/quick    (edit)
 * Products with several variants (sizes, colours…) keep their per-variant prices and stock;
 * the modal links to the full editor for those.
 */
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { PlusIcon, TrashIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { ClientApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { AdminCategoryDTO, AdminProductDetailDTO } from '@/types/admin';
import { ProductImage } from '@/components/product/ProductImage';
import { ErrorBanner, LoadingBlock, Modal, adminButton, adminInput } from './ui';

interface SpecRow {
  key: number;
  label: string;
  value: string;
}

interface FormState {
  name: string;
  categoryId: string;
  brand: string;
  price: string;
  stock: string;
  imageUrl: string;
  description: string;
  isActive: boolean;
  specs: SpecRow[];
}

type Field = 'name' | 'categoryId' | 'price' | 'stock' | 'imageUrl' | 'specs';
type Errors = Partial<Record<Field, string>>;

let specKey = 0;
const nextKey = () => (specKey += 1);

const EMPTY: FormState = {
  name: '',
  categoryId: '',
  brand: '',
  price: '',
  stock: '0',
  imageUrl: '',
  description: '',
  isActive: true,
  specs: [],
};

function fromProduct(product: AdminProductDetailDTO): { form: FormState; multiVariant: boolean } {
  const active = product.variants.filter((v) => v.isActive);
  const main = active[0] ?? product.variants[0];
  return {
    multiVariant: active.length > 1,
    form: {
      name: product.name,
      categoryId: product.categoryId,
      brand: product.brand,
      price: main ? String(main.price / 100) : '',
      stock: main ? String(main.stock) : '0',
      imageUrl: product.images[0] ?? '',
      description: product.description,
      isActive: product.isActive,
      specs: product.specs.map((spec) => ({ key: nextKey(), label: spec.label, value: spec.value })),
    },
  };
}

function validate(form: FormState, multiVariant: boolean): Errors {
  const errors: Errors = {};
  if (form.name.trim().length < 3) errors.name = 'Enter a product title (at least 3 characters).';
  if (!form.categoryId) errors.categoryId = 'Choose a category.';
  if (!multiVariant) {
    const price = Number(form.price.replace(/[₦,\s]/g, ''));
    if (!Number.isFinite(price) || price <= 0) errors.price = 'Enter the selling price in Naira, e.g. 250000.';
    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.stock = 'Enter a whole number of units (0 or more).';
  }
  const url = form.imageUrl.trim();
  if (url && !url.startsWith('/') && !/^https:\/\//.test(url)) errors.imageUrl = 'Use an https:// link, or a path starting with / for a file in your public folder.';
  if (form.specs.some((spec) => (spec.label.trim() === '') !== (spec.value.trim() === ''))) errors.specs = 'Fill in both the name and the value of each spec, or remove the row.';
  return errors;
}

export function ProductQuickModal({
  open,
  productId,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = create a new product */
  productId: string | null;
  categories: AdminCategoryDTO[];
  onClose: () => void;
  onSaved: (product: AdminProductDetailDTO, mode: 'created' | 'updated') => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [multiVariant, setMultiVariant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = productId !== null;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaveError(null);
    setLoadError(null);
    if (!productId) {
      setForm({ ...EMPTY, categoryId: categories[0]?.id ?? '' });
      setMultiVariant(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    apiFetch<AdminProductDetailDTO>(`/api/admin/products/${productId}`, { signal: controller.signal })
      .then((product) => {
        const loaded = fromProduct(product);
        setForm(loaded.form);
        setMultiVariant(loaded.multiVariant);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoadError(err instanceof Error ? err.message : 'Could not load the product.');
        setLoading(false);
      });
    return () => controller.abort();
  }, [open, productId, categories]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key as Field]: undefined }));
  }

  function setSpec(key: number, part: 'label' | 'value', value: string) {
    setForm((current) => ({ ...current, specs: current.specs.map((spec) => (spec.key === key ? { ...spec, [part]: value } : spec)) }));
    if (errors.specs) setErrors((current) => ({ ...current, specs: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    const found = validate(form, multiVariant);
    setErrors(found);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      document.getElementById(`qp-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        brand: form.brand.trim(),
        price: multiVariant ? Number(form.price || '1') : Number(form.price.replace(/[₦,\s]/g, '')),
        stock: multiVariant ? Number(form.stock || '0') : Number(form.stock),
        imageUrl: form.imageUrl.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
        specs: form.specs.filter((spec) => spec.label.trim() && spec.value.trim()).map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() })),
      };
      const saved = await apiFetch<AdminProductDetailDTO>(isEdit ? `/api/admin/products/${productId}/quick` : '/api/admin/products/quick', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      onSaved(saved, isEdit ? 'updated' : 'created');
    } catch (err) {
      setSaveError(err instanceof ClientApiError || err instanceof Error ? err.message : 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`qp-${field}-error`} className="mt-1.5 text-sm text-rose-700">
        {errors[field]}
      </p>
    ) : null;
  const describedBy = (field: Field) => (errors[field] ? `qp-${field}-error` : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="lg"
      title={isEdit ? 'Edit product' : 'Add a product'}
      description={isEdit ? 'Changes go live in the store as soon as you save.' : 'Products added here are never overwritten by supplier syncs.'}
      footer={
        <>
          {isEdit && productId ? (
            <Link href={`/admin/products/${productId}`} className="mr-auto text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
              Open full editor
            </Link>
          ) : null}
          <button type="button" onClick={onClose} disabled={saving} className={adminButton.secondary}>
            Cancel
          </button>
          <button type="submit" form="quick-product-form" disabled={saving || loading || Boolean(loadError)} className={adminButton.primary}>
            {saving ? <Spinner /> : null}
            {isEdit ? 'Save changes' : 'Create product'}
          </button>
        </>
      }
    >
      {loading ? (
        <LoadingBlock label="Loading product…" />
      ) : loadError ? (
        <ErrorBanner message={loadError} />
      ) : categories.length === 0 ? (
        <ErrorBanner message="Create a category first (Admin → Categories), then add products to it." />
      ) : (
        <form id="quick-product-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
          <div>
            <label htmlFor="qp-name" className="mb-1.5 block text-sm font-medium text-slate-800">
              Title
            </label>
            <input
              id="qp-name"
              data-autofocus
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="HP EliteBook 840 G8 – Core i7, 16GB RAM, 512GB SSD"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy('name')}
              className={adminInput}
            />
            {fieldError('name')}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="qp-categoryId" className="mb-1.5 block text-sm font-medium text-slate-800">
                Category
              </label>
              <select
                id="qp-categoryId"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                aria-invalid={errors.categoryId ? true : undefined}
                aria-describedby={describedBy('categoryId')}
                className={adminInput}
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldError('categoryId')}
            </div>
            <div>
              <label htmlFor="qp-brand" className="mb-1.5 block text-sm font-medium text-slate-800">
                Brand <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="qp-brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Taken from the title if blank" className={adminInput} />
            </div>
          </div>

          {multiVariant ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              This product has several variants, each with its own price and stock. Change those in the{' '}
              <Link href={`/admin/products/${productId}`} className="font-semibold underline">
                full editor
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="qp-price" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Price (₦)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₦</span>
                  <input
                    id="qp-price"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="250000"
                    aria-invalid={errors.price ? true : undefined}
                    aria-describedby={describedBy('price')}
                    className={cn(adminInput, 'pl-7 tabular-nums')}
                  />
                </div>
                {fieldError('price')}
              </div>
              <div>
                <label htmlFor="qp-stock" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Stock count
                </label>
                <input
                  id="qp-stock"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  aria-invalid={errors.stock ? true : undefined}
                  aria-describedby={errors.stock ? 'qp-stock-error' : 'qp-stock-hint'}
                  className={cn(adminInput, 'tabular-nums')}
                />
                {errors.stock ? (
                  fieldError('stock')
                ) : (
                  <p id="qp-stock-hint" className="mt-1.5 text-xs text-slate-500">
                    {isEdit ? 'A changed count is saved in the stock history with your name.' : 'Units you have ready to sell.'}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="qp-imageUrl" className="mb-1.5 block text-sm font-medium text-slate-800">
              Image URL <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <div className="flex gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <ProductImage src={form.imageUrl.trim() || null} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  id="qp-imageUrl"
                  value={form.imageUrl}
                  onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder="https://… or /images/products/my-photo.jpg"
                  aria-invalid={errors.imageUrl ? true : undefined}
                  aria-describedby={describedBy('imageUrl')}
                  className={adminInput}
                />
                {fieldError('imageUrl')}
              </div>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-800">Tech specs</legend>
            {form.specs.length === 0 ? <p className="text-sm text-slate-500">No specs yet. Add processor, RAM, capacity, warranty and so on.</p> : null}
            <ul className="flex flex-col gap-2">
              {form.specs.map((spec, index) => (
                <li key={spec.key} className="flex gap-2">
                  <label htmlFor={`qp-spec-label-${spec.key}`} className="sr-only">
                    Spec {index + 1} name
                  </label>
                  <input
                    id={`qp-spec-label-${spec.key}`}
                    value={spec.label}
                    onChange={(e) => setSpec(spec.key, 'label', e.target.value)}
                    placeholder="e.g. Processor"
                    className={cn(adminInput, 'w-2/5')}
                  />
                  <label htmlFor={`qp-spec-value-${spec.key}`} className="sr-only">
                    Spec {index + 1} value
                  </label>
                  <input
                    id={`qp-spec-value-${spec.key}`}
                    value={spec.value}
                    onChange={(e) => setSpec(spec.key, 'value', e.target.value)}
                    placeholder="e.g. Intel Core i7-1185G7"
                    className={cn(adminInput, 'min-w-0 flex-1')}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, specs: current.specs.filter((s) => s.key !== spec.key) }))}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-500 hover:border-rose-300 hover:text-rose-700"
                    aria-label={`Remove spec ${index + 1}`}
                  >
                    <TrashIcon size={16} />
                  </button>
                </li>
              ))}
            </ul>
            {errors.specs ? (
              <p id="qp-specs-error" className="mt-1.5 text-sm text-rose-700">
                {errors.specs}
              </p>
            ) : null}
            <button
              type="button"
              id="qp-specs"
              onClick={() => setForm((current) => ({ ...current, specs: [...current.specs, { key: nextKey(), label: '', value: '' }] }))}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <PlusIcon size={16} />
              Add a spec
            </button>
          </fieldset>

          <div>
            <label htmlFor="qp-description" className="mb-1.5 block text-sm font-medium text-slate-800">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="qp-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="What it is, who it's for, what's in the box. Leave blank for a standard description."
              className={cn(adminInput, 'h-auto py-2.5')}
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-800">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
            Show this product in the store (uncheck to keep it archived)
          </label>

          {saveError ? <ErrorBanner message={saveError} /> : null}
        </form>
      )}
    </Modal>
  );
}
