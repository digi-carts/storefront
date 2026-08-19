import { NextResponse } from 'next/server';

// Dynamic manifest that returns store-specific PWA data
// The storefront's ThemeInjector handles favicon via JS
// This endpoint can be called from a per-store route if needed
export async function GET() {
  return NextResponse.json({
    name: 'Store',
    short_name: 'Shop',
    description: 'Your online store',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });
}
