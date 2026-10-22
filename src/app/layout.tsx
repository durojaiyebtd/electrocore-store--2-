import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { site } from '@/lib/site';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.brandName} | Electronics, Computers & Engineering Services in Nigeria`,
    template: `%s | ${site.brandName}`,
  },
  description: site.description,
  applicationName: site.brandName,
  openGraph: {
    type: 'website',
    siteName: site.brandName,
    locale: 'en_NG',
    title: `${site.brandName} — ${site.tagline}`,
    description: site.description,
  },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#d42073',
  width: 'device-width',
  initialScale: 1,
};

// Pages read live catalog/cart data, so they are rendered per request.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
