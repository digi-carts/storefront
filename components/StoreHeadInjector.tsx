'use client';

import { useEffect } from 'react';
import { useStorefrontStore } from '@/lib/storefront-store';

export function StoreHeadInjector() {
  const { store } = useStorefrontStore();

  useEffect(() => {
    if (!store) return;
    const branding = (store.branding || {}) as Record<string, string>;
    const name = store.name || 'Shop';

    // Tab title: custom tabTitle takes priority over store name
    document.title = branding.tabTitle || name;

    // Favicon — remove any existing icon links and recreate to force browser refresh
    if (branding.faviconUrl) {
      document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove());
      const link = document.createElement('link');
      link.rel = 'icon';
      const ext = branding.faviconUrl.split('.').pop()?.toLowerCase();
      const typeMap: Record<string, string> = {
        svg: 'image/svg+xml', ico: 'image/x-icon', png: 'image/png',
        jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
      };
      link.type = typeMap[ext ?? ''] || 'image/png';
      link.href = branding.faviconUrl;
      document.head.appendChild(link);
    }

    // Apple touch icon (PWA home screen)
    if (branding.pwaIconUrl) {
      document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(el => el.remove());
      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = branding.pwaIconUrl;
      document.head.appendChild(apple);
    }
  }, [store]);

  return null;
}
