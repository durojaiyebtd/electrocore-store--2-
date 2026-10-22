import { discountPercent, formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface PriceProps {
  price: number;
  compareAtPrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  prefix?: string;
  className?: string;
}

export function Price({ price, compareAtPrice, size = 'md', prefix, className }: PriceProps) {
  const saving = discountPercent(price, compareAtPrice);
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
      <span
        className={cn(
          'font-semibold tracking-tight text-slate-900 tabular-nums',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-3xl',
        )}
      >
        {prefix ? <span className="mr-1 text-sm font-normal text-slate-500">{prefix}</span> : null}
        {formatMoney(price)}
      </span>
      {saving > 0 && compareAtPrice ? (
        <>
          <span className={cn('text-slate-400 line-through tabular-nums', size === 'lg' ? 'text-base' : 'text-sm')}>
            {formatMoney(compareAtPrice)}
          </span>
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Save {saving}%</span>
        </>
      ) : null}
    </div>
  );
}
