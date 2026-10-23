'use client';

/**
 * "Unauthorized Access" alert shown at the top of the page when the middleware turns
 * someone away from /admin (it redirects to /?unauthorized=sign-in or =forbidden).
 * The query parameter is removed from the address bar right away, so refreshing the
 * page or sharing the link does not show the alert again.
 */
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertIcon, CloseIcon } from '@/components/ui/Icons';
import { UNAUTHORIZED_REASONS, isUnauthorizedReason, type UnauthorizedReason } from '@/lib/safe-redirect';

export function UnauthorizedNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [reason, setReason] = useState<UnauthorizedReason | null>(null);

  useEffect(() => {
    const value = searchParams.get('unauthorized');
    if (!isUnauthorizedReason(value)) return;
    setReason(value);
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete('unauthorized');
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  if (!reason) return null;

  return (
    <div className="border-b border-rose-200 bg-rose-50">
      <div role="alert" className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-sm text-rose-900 sm:px-6 lg:px-8">
        <AlertIcon size={20} className="mt-0.5 shrink-0 text-rose-600" />
        <p className="min-w-0 flex-1">
          <strong className="font-semibold">Unauthorized Access.</strong> {UNAUTHORIZED_REASONS[reason].replace(/^Unauthorized Access:\s*/, '')}{' '}
          {reason === 'sign-in' ? (
            <Link href="/account?next=/admin" className="font-semibold underline underline-offset-2">
              Sign in
            </Link>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setReason(null)}
          className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-rose-700 hover:bg-rose-100"
          aria-label="Dismiss alert"
        >
          <CloseIcon size={18} />
        </button>
      </div>
    </div>
  );
}
