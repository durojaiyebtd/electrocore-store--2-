'use client';

/**
 * Admin portal frame: sidebar navigation on desktop, top bar + drawer on phones.
 * Kept separate from the storefront header/footer.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/layout/Logo';
import { CartIcon, ChipIcon, CloseIcon, KeyboardIcon, LockIcon, MenuIcon, UserIcon, BoltIcon, WrenchIcon } from '@/components/ui/Icons';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: BoltIcon, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: CartIcon },
  { href: '/admin/products', label: 'Products', icon: KeyboardIcon },
  { href: '/admin/transactions', label: 'Transactions', icon: LockIcon },
  { href: '/admin/inventory', label: 'Inventory', icon: ChipIcon },
  { href: '/admin/reports', label: 'Reports', icon: BoltIcon },
  { href: '/admin/customers', label: 'Customers', icon: UserIcon },
  { href: '/admin/categories', label: 'Categories', icon: MenuIcon },
  { href: '/admin/content', label: 'Website content', icon: MenuIcon },
  { href: '/admin/notifications', label: 'Notifications', icon: BoltIcon },
  { href: '/admin/settings', label: 'Settings', icon: WrenchIcon },
] as const;

interface AdminShellProps {
  admin: { firstName: string; lastName: string; email: string };
  children: ReactNode;
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = 'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
              )}
            >
              <Icon size={18} className={active ? 'text-volt-400' : undefined} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  const footer = (
    <div className="border-t border-brand-100 p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          {admin.firstName.charAt(0)}
          {admin.lastName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {admin.firstName} {admin.lastName}
          </p>
          <p className="truncate text-xs text-slate-500">{admin.email}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link href="/" className="flex h-9 items-center justify-center rounded-md border border-brand-200 text-xs font-semibold text-brand-700 hover:bg-brand-50">
          View store
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex h-9 items-center justify-center rounded-md border border-brand-200 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 px-2">
      <LogoMark className="h-8 w-8" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-slate-900">ElectroCore</span>
        <span className="block text-xs text-slate-500">Admin portal</span>
      </span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden print:!hidden h-screen w-60 shrink-0 flex-col border-r border-brand-100 bg-white lg:flex">
        <div className="flex h-16 items-center px-3">{brand}</div>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks pathname={pathname} />
        </nav>
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 print:hidden items-center gap-3 border-b border-brand-100 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-brand-50"
            aria-label="Open admin menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon />
          </button>
          {brand}
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Admin menu" className="absolute inset-y-0 left-0 flex w-72 animate-slide-in-left flex-col bg-white motion-reduce:animate-none">
            <div className="flex h-14 items-center justify-between px-3">
              {brand}
              <button type="button" onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-brand-50" aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>
            <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </nav>
            {footer}
          </div>
        </div>
      ) : null}
    </div>
  );
}
