import { NextRequest, NextResponse } from 'next/server';
import { canonicalStoreSlug } from '@/lib/store-domain';

const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST || 'digi-cart-storefront-496160804659.us-east1.run.app';

function publicHost(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-host') || req.headers.get('x-original-host') || '';
  const fromForwarded = forwarded.split(',')[0].trim();
  const host = (fromForwarded || req.headers.get('host') || '').split(':')[0];
  return host.toLowerCase();
}

function isBarePlatformHost(host: string): boolean {
  return host === MAIN_HOST || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.run.app');
}

export function middleware(req: NextRequest) {
  const host = publicHost(req);
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith('/s/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/')
  ) {
    return NextResponse.next();
  }

  if (isBarePlatformHost(host)) {
    return NextResponse.next();
  }

  const storeSlug = canonicalStoreSlug(host);
  if (!storeSlug) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/s/${storeSlug}${pathname === '/' ? '' : pathname}`;
  const res = NextResponse.rewrite(url);
  res.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
