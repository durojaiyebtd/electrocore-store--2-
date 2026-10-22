import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Brand mark: a core (circle) wired to four traces, echoing a circuit board via. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('h-9 w-9', className)} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="10" fill="#d42073" />
      <path d="M20 6v7M20 27v7M6 20h7M27 20h7" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20" cy="20" r="6.5" fill="none" stroke="#ffffff" strokeWidth="2.6" />
      <circle cx="20" cy="20" r="2.4" fill="#ffd23f" />
    </svg>
  );
}

export function Logo({ inverted = false, onClick }: { inverted?: boolean; onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cn('text-[0.68rem] font-medium tracking-wide', inverted ? 'text-slate-400' : 'text-slate-500')}>Magnificent</span>
        <span className={cn('text-lg font-bold tracking-tight', inverted ? 'text-white' : 'text-slate-900')}>ElectroCore</span>
      </span>
      <span className="sr-only">Magnificent ElectroCore — home</span>
    </Link>
  );
}
