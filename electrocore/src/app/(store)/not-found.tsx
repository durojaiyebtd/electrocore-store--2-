import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <p className="font-mono text-sm text-brand-700">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">This page isn’t here</h1>
      <p className="mt-3 max-w-md text-slate-600">The link may be out of date, or the product may have been removed from the catalog.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">
          Browse the catalog
        </Link>
        <Link href="/" className="btn-secondary">
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
