'use client';

/**
 * Quick create / edit dialog for a product: title, Naira price, stock, image URL,
 * tech specs, category and the on-sale switch.
 *
 * Products with several variants (sizes, colours...) keep their variants untouched
 * here; their prices and stock are edited in the full editor.
 */
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CloseIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { slugify } from '@/lib/utils';
import type { Fulfillment } from '@/types';
import type { AdminCategoryDTO, AdminProductDetailDTO } from '@/types/admin';
import { ProductImage } from '@/components/product/ProductImage';
import { PhotoUpload } from './PhotoUpload';
import { ErrorBanner, LoadingBlock, adminButton, adminInput, useAdminQuery } from './ui';

interface ProductModalProps {
  /** Omit to create a new product. */
  productId?: string;
  categories: AdminCategoryDTO[];
  onClose: () => void;
  /** Called after a successful save so the list can refresh. */
  onSaved: (message: string) => void;
}

interface FormValues {
  name: string;
  brand: string;
  categoryId: string;
  price: string; // Naira
  stock: string;
  imageUrl: string;
  shortDescription: string;
  description: string;
  specsText: string; // one "Label: Value" per line
  fulfillment: Fulfillment;
  isActive: boolean;
}

function blankValues(categories: AdminCategoryDTO[]): FormValues {
  return {
    name: '',
    brand: 'ElectroCore',
    categoryId: categories[0]?.id ?? '',
    price: '',
    stock: '0',
    imageUrl: '',
    shortDescription: '',
    description: '',
    specsText: '',
    fulfillment: 'PHYSICAL',
    isActive: true,
  };
}

function valuesFromProduct(product: AdminProductDetailDTO): FormValues {
  const only = product.variants.length === 1 ? product.variants[0] : null;
  return {
    name: product.name,
    brand: product.brand,
    categoryId: product.categoryId,
    price: only ? String(only.price / 100) : '',
    stock: only ? String(only.stock) : '0',
    imageUrl: product.images[0] ?? '',
    shortDescription: product.shortDescription,
    description: product.description,
    specsText: product.specs.map((spec) => `${spec.label}: ${spec.value}`).join('\n'),
    fulfillment: product.fulfillment,
    isActive: product.isActive,
  };
}

/** "Label: Value" per line -> specs. Returns an error message for a line without a colon. */
function parseSpecs(text: string): { specs: Array<{ label: string; value: string }>; error: string | null } {
  const specs: Array<{ label: string; value: string }> = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 1 || colon === line.length - 1) {
      return { specs, error: `Write each spec as "Label: Value", for example "RAM: 16GB". Check this line: ${line}` };
    }
    specs.push({ label: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() });
  }
  return { specs, error: null };
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

export function ProductModal({ productId, categories, onClose, onSaved }: ProductModalProps) {
  const detail = useAdminQuery<AdminProductDetailDTO>(productId ? `/api/admin/products/${productId}` : null);
  const editing = Boolean(productId);

  if (editing && detail.error) {
    return (
      <ModalFrame title="Edit product" onClose={onClose}>
        <ErrorBanner message={detail.error} onRetry={detail.reload} />
      </ModalFrame>
    );
  }
  if (editing && (detail.loading || !detail.data)) {
    return (
      <ModalFrame title="Edit product" onClose={onClose}>
        <LoadingBlock label="Loading product…" />
      </ModalFrame>
    );
  }

  return <ProductModalForm product={detail.data ?? undefined} categories={categories} onClose={onClose} onSaved={onSaved} />;
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 animate-fade-in bg-slate-900/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl animate-scale-in rounded-2xl bg-white p-5 shadow-2xl motion-reduce:animate-none sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProductModalForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product?: AdminProductDetailDTO;
  categories: AdminCategoryDTO[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [values, setValues] = useState<FormValues>(() => (product ? valuesFromProduct(product) : blankValues(categories)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const singleVariant = !product || product.variants.length === 1;
  const physical = values.fulfillment === 'PHYSICAL';

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = values.name.trim();
    if (name.length < 3) return setError('Enter the product title (at least 3 characters).');
    if (!values.categoryId) return setError('Choose a category.');
    const imageUrl = values.imageUrl.trim();
    if (imageUrl && !(imageUrl.startsWith('/') || /^https:\/\//.test(imageUrl))) {
      return setError('The image URL must start with https:// (or / for a file in the public folder).');
    }
    const shortDescription = values.shortDescription.trim();
    if (shortDescription.length < 10) return setError('Add a short description of at least 10 characters.');
    const description = values.description.trim() || shortDescription;
    if (description.length < 20) return setError('Add a longer description (at least 20 characters), or lengthen the short one.');
    const parsed = parseSpecs(values.specsText);
    if (parsed.error) return setError(parsed.error);

    let priceNaira = 0;
    let stock = 0;
    if (singleVariant) {
      priceNaira = Number(values.price);
      if (values.price.trim() === '' || !Number.isFinite(priceNaira) || priceNaira < 0) return setError('Enter the price in Naira, for example 125000.');
      stock = Math.trunc(Number(values.stock));
      if (!Number.isFinite(stock) || stock < 0) return setError('Stock must be zero or more.');
    }

    // Keep any extra pictures the product already had; the first one is the URL typed here
    const otherImages = product ? product.images.slice(1) : [];
    const images = [imageUrl, ...otherImages].filter(Boolean);

    const variants = product
      ? product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          options: variant.options,
          price: singleVariant ? priceNaira : variant.price / 100,
          compareAtPrice: variant.compareAtPrice ? variant.compareAtPrice / 100 : null,
          stock: 0, // existing variants change stock through a logged adjustment, below
          image: variant.image,
          isDefault: variant.isDefault,
          isActive: variant.isActive,
        }))
      : [
          {
            sku: `EC-${slugify(name).slice(0, 18).toUpperCase().replace(/-+$/, '')}-${Date.now().toString(36).toUpperCase().slice(-5)}`,
            name: '',
            options: [],
            price: priceNaira,
            compareAtPrice: null,
            stock: physical ? stock : 0,
            image: null,
            isDefault: true,
            isActive: true,
          },
        ];

    const body = {
      name,
      slug: product?.slug ?? '',
      brand: values.brand.trim() || 'ElectroCore',
      categoryId: values.categoryId,
      shortDescription,
      description,
      images,
      specs: parsed.specs,
      tags: product?.tags ?? [],
      fulfillment: values.fulfillment,
      warrantyMonths: product?.warrantyMonths ?? 12,
      featured: product?.featured ?? false,
      homeRank: product?.homeRank ?? 0,
      isActive: values.isActive,
      variants,
    };

    setSaving(true);
    try {
      if (product) {
        const saved = await apiFetch<AdminProductDetailDTO>(`/api/admin/products/${product.id}`, { method: 'PUT', body });
        // Stock of an existing single variant: record the change in the inventory log
        const variant = saved.variants[0];
        if (singleVariant && physical && variant && variant.stock !== stock) {
          await apiFetch('/api/admin/inventory/adjust', {
            method: 'POST',
            body: { variantId: variant.id, mode: 'set', quantity: stock, reason: 'ADJUSTMENT', note: 'Edited in the product dialog' },
          });
        }
        onSaved(`Saved “${saved.name}”.`);
      } else {
        const created = await apiFetch<AdminProductDetailDTO>('/api/admin/products', { method: 'POST', body });
        onSaved(`Created “${created.name}”${created.isActive ? ' and it is live in the store' : ' (hidden from the store)'}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
      setSaving(false);
    }
  }

  return (
    <ModalFrame title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {product && product.source !== 'manual' ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This product came from the supplier feed ({product.source}). The next supplier sync can overwrite its text, price and stock.
          </p>
        ) : null}

        <Field id="pm-name" label="Title">
          <input id="pm-name" className={adminInput} value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={160} autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pm-category" label="Category">
            <select id="pm-category" className={adminInput} value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="pm-brand" label="Brand">
            <input id="pm-brand" className={adminInput} value={values.brand} onChange={(e) => set('brand', e.target.value)} maxLength={60} />
          </Field>
        </div>

        {singleVariant ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pm-price" label="Price (₦ NGN)" hint="Customers see exactly this price.">
              <input id="pm-price" className={adminInput} inputMode="decimal" value={values.price} onChange={(e) => set('price', e.target.value)} placeholder="125000" />
            </Field>
            <Field id="pm-stock" label="Stock" hint={physical ? undefined : 'Digital items and services are not counted.'}>
              <input id="pm-stock" className={adminInput} inputMode="numeric" value={values.stock} onChange={(e) => set('stock', e.target.value)} disabled={!physical} />
            </Field>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            This product has {product?.variants.length} variants. Change their prices and stock in the{' '}
            <Link href={`/admin/products/${product?.id}`} className="font-semibold text-brand-700 underline-offset-4 hover:underline">
              full editor
            </Link>
            . Everything else can be edited here.
          </p>
        )}

        <div>
          <PhotoUpload onUploaded={(url) => set('imageUrl', url)} label="Upload photo from your computer" />
          {values.imageUrl ? (
            <div className="mt-2 h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <ProductImage src={values.imageUrl} alt="Selected product photo" className="h-full w-full object-contain" />
            </div>
          ) : null}
        </div>
        <Field id="pm-image" label="Or paste an image link" hint="A link starting with https:// to a clear product photo on a white background. Uploading a JPG, PNG or WebP (up to 3 MB) fills this in for you.">
          <input id="pm-image" className={adminInput} value={values.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…/laptop.jpg" inputMode="url" />
        </Field>

        <Field id="pm-short" label="Short description" hint="One or two sentences shown on product cards.">
          <textarea id="pm-short" rows={2} maxLength={300} className={`${adminInput} h-auto py-2`} value={values.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
        </Field>

        <Field id="pm-description" label="Full description (optional)" hint="Leave empty to reuse the short description.">
          <textarea id="pm-description" rows={3} maxLength={8000} className={`${adminInput} h-auto py-2`} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <Field id="pm-specs" label="Tech specs" hint="One per line, written as Label: Value">
          <textarea
            id="pm-specs"
            rows={5}
            className={`${adminInput} h-auto py-2 font-mono text-xs`}
            value={values.specsText}
            onChange={(e) => set('specsText', e.target.value)}
            placeholder={'Processor: Intel Core i7\nRAM: 16GB\nStorage: 512GB SSD'}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pm-fulfillment" label="Type">
            <select id="pm-fulfillment" className={adminInput} value={values.fulfillment} onChange={(e) => set('fulfillment', e.target.value as Fulfillment)}>
              <option value="PHYSICAL">Physical product (delivered)</option>
              <option value="DIGITAL">Digital (licence key)</option>
              <option value="SERVICE">Service (booking)</option>
            </select>
          </Field>
          <div className="flex items-end">
            <label className="flex h-10 cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
              <button
                type="button"
                role="switch"
                aria-checked={values.isActive}
                onClick={() => set('isActive', !values.isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${values.isActive ? 'bg-brand-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${values.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span>{values.isActive ? 'On sale in the store' : 'Hidden from the store'}</span>
            </label>
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className={adminButton.secondary} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={adminButton.primary} disabled={saving}>
            {saving ? <Spinner /> : null}
            {product ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
