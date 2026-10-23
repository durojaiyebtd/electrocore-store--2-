import { Suspense, type ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartProvider } from '@/components/cart/CartProvider';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { UnauthorizedAlert } from '@/components/layout/UnauthorizedAlert';
import { QuickViewProvider } from '@/components/product/QuickViewProvider';

/** Storefront shell: header, footer, cart and quick view. The admin portal has its own layout. */
export default async function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-brand-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <AuthProvider>
        <CartProvider>
          <QuickViewProvider>
            <AnnouncementBar />
            <Header />
            <Suspense fallback={null}>
              <UnauthorizedAlert />
            </Suspense>
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
            <CartDrawer />
          </QuickViewProvider>
        </CartProvider>
      </AuthProvider>
    </>
  );
}
