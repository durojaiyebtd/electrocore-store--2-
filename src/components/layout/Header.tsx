'use client';

/**
 * Site header — core navigation ONLY: logo, Home, Shop, search, account, cart.
 * (Legal text, policies and addresses live exclusively in the Footer.)
 */
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { CartIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href) || (href === '/shop' && pathname.startsWith('/product'));
}

function SearchForm({ onSubmitted, autoFocus = false, id }: { onSubmitted?: () => void; autoFocus?: boolean; id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search laptops, inverters, repairs…"
        autoFocus={autoFocus}
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-[0.95rem] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </form>
  );
}

function CartButton() {
  const { cart, openDrawer, loading } = useCart();
  const count = cart.itemCount;
  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
      aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <CartIcon size={22} />
      {!loading && count > 0 ? (
        <span
          key={count}
          className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 animate-scale-in place-items-center rounded-full bg-brand-600 px-1 text-[0.7rem] font-bold text-white tabular-nums ring-2 ring-white motion-reduce:animate-none"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-[4.5rem] lg:gap-8 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <MenuIcon size={22} />
        </button>

        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-2 text-[0.95rem] font-medium transition-colors',
                    isActive(pathname, item.href) ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden flex-1 md:block md:max-w-md lg:max-w-lg">
          <Suspense fallback={<div className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50" />}>
            <SearchForm id="header-search" />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Search products"
          >
            <SearchIcon size={21} />
          </button>
          <Link
            href="/account"
            className={cn(
              'hidden h-11 items-center gap-2 rounded-lg px-3 text-[0.95rem] font-medium hover:bg-slate-100 sm:flex',
              pathname.startsWith('/account') ? 'text-brand-700' : 'text-slate-700',
            )}
          >
            <UserIcon size={20} />
            <span className="hidden xl:inline">Account</span>
            <span className="sr-only xl:hidden">Account</span>
          </Link>
          <CartButton />
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/50" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-slide-in-left flex-col bg-white shadow-2xl motion-reduce:animate-none"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <Logo onClick={() => setMenuOpen(false)} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="p-4">
              <Suspense fallback={null}>
                <SearchForm id="mobile-search" onSubmitted={() => setMenuOpen(false)} />
              </Suspense>
            </div>
            <nav aria-label="Mobile" className="px-2">
              <ul className="flex flex-col">
                {[...NAV, { href: '/account', label: 'Account' } as const].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                      className={cn(
                        'flex h-12 items-center rounded-lg px-3 text-base font-medium',
                        isActive(pathname, item.href) ? 'bg-brand-50 text-brand-700' : 'text-slate-800 hover:bg-slate-50',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
