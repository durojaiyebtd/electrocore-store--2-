import { Suspense, type ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { UnauthorizedNotice } from '@/components/auth/UnauthorizedNotice';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartProvider } from '@/components/cart/CartProvider';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { QuickViewProvider } from '@/components/product/QuickViewProvider';
import { currentUser } from '@/server/services/auth.service';
import type { SessionUserDTO } from '@/types';

/** The signed-in user for the first paint of the header. A database hiccup must never break the storefront. */
async function initialUser(): Promise<SessionUserDTO | null> {
  try {
    return await currentUser();
  } catch (error) {
    console.error('[store] Could not read the signed-in user:', error);
    return null;
  }
}

/**
 * Storefront shell: header, footer, cart and quick view. The admin portal has its own layout.
 * Browsing, product pages and the cart are open to everyone; checkout asks for sign-in.
 */
export default async function StoreLayout({ children }: { children: ReactNode }) {
  const user = await initialUser();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-brand-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <CartProvider>
        <AuthProvider initialUser={user}>
          <QuickViewProvider>
            <Header />
            <Suspense fallback={null}>
              <UnauthorizedNotice />
            </Suspense>
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
            <CartDrawer />
          </QuickViewProvider>
        </AuthProvider>
      </CartProvider>
    </>
  );
}
