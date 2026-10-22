import { StarIcon } from '@/components/ui/Icons';

export function Rating({ value, count, compact = false }: { value: number; count: number; compact?: boolean }) {
  if (count === 0) return null;
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600" aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count} reviews`}>
      <span className="flex text-amber-500" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} size={compact ? 13 : 15} filled={rounded >= star - 0.5} />
        ))}
      </span>
      <span className="tabular-nums">{value.toFixed(1)}</span>
      <span className="text-slate-400">({count})</span>
    </div>
  );
}
