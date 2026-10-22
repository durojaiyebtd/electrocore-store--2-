'use client';

/**
 * Inline stock adjustment for one variant. Every change is written to the
 * inventory log with the admin's email and a reason.
 */
import { useState, type FormEvent } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { adminButton, adminInput } from './ui';

interface StockAdjusterProps {
  variantId: string;
  label: string;
  currentStock: number;
  onDone: (newStock: number) => void;
  onCancel: () => void;
}

export function StockAdjuster({ variantId, label, currentStock, onDone, onCancel }: StockAdjusterProps) {
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<'RESTOCK' | 'ADJUSTMENT' | 'RETURN'>('RESTOCK');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = Number(quantity);
  const preview =
    quantity === '' || !Number.isFinite(qty) ? null : mode === 'add' ? currentStock + qty : mode === 'remove' ? currentStock - qty : qty;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ stock: number }>('/api/admin/inventory/adjust', {
        method: 'POST',
        body: { variantId, mode, quantity: qty, reason, note: note || undefined },
      });
      onDone(result.stock);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update stock.');
      setBusy(false);
    }
  }

  const idPrefix = `adj-${variantId}`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50/50 p-4">
      <p className="text-sm font-medium text-slate-900">
        Adjust stock: {label} <span className="font-normal text-slate-500">(now {currentStock})</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-[auto_120px_1fr]">
        <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm" role="radiogroup" aria-label="Adjustment type">
          {(['add', 'remove', 'set'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value);
                setReason(value === 'add' ? 'RESTOCK' : 'ADJUSTMENT');
              }}
              className={cn('h-10 flex-1 px-3 font-medium', mode === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              {value === 'add' ? 'Add' : value === 'remove' ? 'Remove' : 'Set to'}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-qty`} className="sr-only">Quantity</label>
          <input
            id={`${idPrefix}-qty`}
            type="number"
            inputMode="numeric"
            min={0}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className={adminInput}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-reason`} className="sr-only">Reason</label>
          <select id={`${idPrefix}-reason`} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className={adminInput}>
            <option value="RESTOCK">New delivery from supplier</option>
            <option value="ADJUSTMENT">Stock count correction / damage</option>
            <option value="RETURN">Customer return</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-note`} className="sr-only">Note</label>
        <input id={`${idPrefix}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note, e.g. supplier invoice number (optional)" className={adminInput} />
      </div>
      {preview !== null ? (
        <p className={cn('text-sm', preview < 0 ? 'text-rose-700' : 'text-slate-600')}>
          {preview < 0 ? 'You cannot remove more than is in stock.' : <>New stock level: <strong className="tabular-nums">{preview}</strong></>}
        </p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || quantity === '' || (preview !== null && preview < 0)} className={adminButton.primary}>
          {busy ? <Spinner /> : null}
          Save stock change
        </button>
        <button type="button" onClick={onCancel} className={adminButton.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
