import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ThemeInjector } from '@/lib/theme-store';
import { StoreProviders } from '@/components/StoreProviders';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Your online store',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon.svg' },
};

// Multi-tenant: never serve a prerendered empty "/" for every custom domain.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--sf-bg)', color: 'var(--sf-text)' }}>
        <ThemeInjector />
        <StoreProviders>{children}</StoreProviders>
      </body>
    </html>
  );
}
