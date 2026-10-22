import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

/** Fallback for URLs that match no route at all (outside the storefront and admin layouts). */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Logo />
      <p className="mt-10 font-mono text-sm text-brand-700">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">This page isn’t here</h1>
      <p className="mt-3 max-w-md text-slate-600">The link may be out of date, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">
          Browse the catalog
        </Link>
        <Link href="/" className="btn-secondary">
          Go to the homepage
        </Link>
      </div>
    </main>
  );
}
