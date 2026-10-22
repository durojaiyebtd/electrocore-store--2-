'use client';

/**
 * Variant selector + quantity + add to cart. Shared by the product page and the
 * quick-view modal.
 */
import { useMemo, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { AlertIcon, CheckIcon, MinusIcon, PlusIcon, ShieldIcon, TruckIcon, WrenchIcon, MailIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { ProductDetailDTO, VariantDTO } from '@/types';
import { Price } from './Price';

interface PurchasePanelProps {
  product: ProductDetailDTO;
  onVariantChange?: (variant: VariantDTO | null) => void;
  compact?: boolean;
}

type Selection = Record<string, string>;

function selectionOf(variant: VariantDTO | undefined): Selection {
  return Object.fromEntries((variant?.options ?? []).map((option) => [option.name, option.value]));
}

function matches(variant: VariantDTO, selection: Selection): boolean {
  return Object.entries(selection).every(([name, value]) => variant.options.some((o) => o.name === name && o.value === value));
}

const FULFILLMENT_NOTE = {
  PHYSICAL: { icon: TruckIcon, text: 'Delivered nationwide. Free delivery on qualifying orders.' },
  DIGITAL: { icon: MailIcon, text: 'Licence key emailed after payment. No delivery fee.' },
  SERVICE: { icon: WrenchIcon, text: 'Our team contacts you within one business day to schedule.' },
} as const;

export function PurchasePanel({ product, onVariantChange, compact = false }: PurchasePanelProps) {
  const { addItem, addingVariantId, error, clearError } = useCart();
  const initial = product.variants.find((v) => v.isDefault && v.stock > 0) ?? product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [selection, setSelection] = useState<Selection>(() => selectionOf(initial));
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = useMemo(
    () => product.variants.find((variant) => matches(variant, selection)) ?? null,
    [product.variants, selection],
  );

  const stock = selectedVariant?.stock ?? 0;
  const maxQuantity = Math.min(stock, 99);
  const isAdding = selectedVariant !== null && addingVariantId === selectedVariant.id;

  function valueState(groupName: string, value: string): 'available' | 'soldout' | 'unavailable' {
    const candidate = { ...selection, [groupName]: value };
    const exact = product.variants.find((variant) => matches(variant, candidate));
    if (exact) return exact.stock > 0 ? 'available' : 'soldout';
    const anyWithValue = product.variants.some((variant) => variant.options.some((o) => o.name === groupName && o.value === value));
    return anyWithValue ? 'available' : 'unavailable';
  }

  function choose(groupName: string, value: string) {
    clearError();
    setJustAdded(false);
    let next: Selection = { ...selection, [groupName]: value };
    let variant = product.variants.find((v) => matches(v, next));
    if (!variant) {
      // Keep the chosen value and adjust the other options to the nearest valid combination
      variant =
        product.variants.find((v) => v.options.some((o) => o.name === groupName && o.value === value) && v.stock > 0) ??
        product.variants.find((v) => v.options.some((o) => o.name === groupName && o.value === value));
      next = selectionOf(variant);
    }
    setSelection(next);
    setQuantity(1);
    onVariantChange?.(variant ?? null);
  }

  async function handleAdd() {
    if (!selectedVariant) return;
    const added = await addItem(selectedVariant.id, quantity);
    if (added) {
      setJustAdded(true);
      setQuantity(1);
    }
  }

  const note = FULFILLMENT_NOTE[product.fulfillment];
  const NoteIcon = note.icon;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Price price={selectedVariant?.price ?? product.price} compareAtPrice={selectedVariant?.compareAtPrice ?? product.compareAtPrice} size="lg" />
        <p className="mt-1 text-sm text-slate-500">Price includes VAT where applicable.</p>
      </div>

      {product.optionGroups.map((group) => (
        <fieldset key={group.name}>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            {group.name}: <span className="font-semibold text-slate-900">{selection[group.name] ?? 'Select'}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const state = valueState(group.name, value);
              const selected = selection[group.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(group.name, value)}
                  disabled={state === 'unavailable'}
                  aria-pressed={selected}
                  className={cn(
                    'relative min-h-[42px] rounded-lg border px-3.5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                    selected
                      ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
                    state === 'soldout' && 'text-slate-400 line-through decoration-slate-400',
                    state === 'unavailable' && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-2 text-sm">
        {selectedVariant && stock > 0 ? (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-slate-700">
              {product.fulfillment !== 'PHYSICAL' ? 'Available now' : stock <= 5 ? `Only ${stock} left in stock` : 'In stock, ready to ship'}
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
            <span className="text-slate-700">This configuration is sold out. Try another option.</span>
          </>
        )}
        {selectedVariant ? <span className="ml-auto font-mono text-xs text-slate-400">SKU {selectedVariant.sku}</span> : null}
      </div>

      <div className={cn('flex gap-3', compact ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row')}>
        <div className="flex h-12 items-center rounded-lg border border-slate-300 bg-white">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="grid h-full w-11 place-items-center text-slate-600 hover:text-slate-900 disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <MinusIcon size={18} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, maxQuantity)}
            value={quantity}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) setQuantity(Math.min(Math.max(1, Math.floor(next)), Math.max(1, maxQuantity)));
            }}
            className="h-full w-12 border-x border-slate-200 text-center text-base font-medium tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Quantity"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity}
            className="grid h-full w-11 place-items-center text-slate-600 hover:text-slate-900 disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <PlusIcon size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedVariant || stock <= 0 || isAdding}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-base font-semibold text-white shadow-lift transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {isAdding ? <Spinner /> : justAdded ? <CheckIcon size={18} /> : null}
          {stock <= 0 ? 'Sold out' : isAdding ? 'Adding…' : justAdded ? 'Added to cart' : product.fulfillment === 'SERVICE' ? 'Book this service' : 'Add to cart'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
          <AlertIcon size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <ul className="grid gap-2.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        <li className="flex gap-2.5">
          <NoteIcon size={18} className="mt-0.5 shrink-0 text-brand-600" />
          {note.text}
        </li>
        {product.warrantyMonths > 0 ? (
          <li className="flex gap-2.5">
            <ShieldIcon size={18} className="mt-0.5 shrink-0 text-brand-600" />
            {product.warrantyMonths >= 12
              ? `${product.warrantyMonths / 12 >= 2 ? `${Math.round(product.warrantyMonths / 12)}-year` : '1-year'} warranty, serviced by our own engineers.`
              : `${product.warrantyMonths}-month workmanship warranty.`}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
