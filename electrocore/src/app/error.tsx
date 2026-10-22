'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">This page failed to load</h1>
      <p className="mt-3 max-w-md text-slate-600">
        The store could not reach its database or a service it depends on. Try again in a moment.
      </p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-slate-400">Error ID {error.digest}</p> : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
