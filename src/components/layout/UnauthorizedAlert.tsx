'use client';

/**
 * Shown when someone without admin rights tried to open /admin. The middleware
 * redirects them to the home page with "?error=unauthorized"; this banner
 * explains why and removes itself from the address bar when dismissed.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertIcon, CloseIcon } from '@/components/ui/Icons';

export function UnauthorizedAlert() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const flagged = searchParams.get('error') === 'unauthorized';
  const [visible, setVisible] = useState(flagged);

  useEffect(() => {
    setVisible(flagged);
  }, [flagged]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('error');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div role="alert" className="border-b border-rose-200 bg-rose-50">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-sm text-rose-900 sm:px-6 lg:px-8">
        <AlertIcon size={18} className="mt-0.5 shrink-0" />
        <p className="flex-1">
          <strong>Unauthorized Access.</strong> The admin portal is only for store administrators. If you should have access, sign in with an admin account.
        </p>
        <button type="button" onClick={dismiss} className="grid h-7 w-7 place-items-center rounded-md hover:bg-rose-100" aria-label="Dismiss alert">
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
