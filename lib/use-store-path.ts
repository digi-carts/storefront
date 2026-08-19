'use client';

import { usePathname } from 'next/navigation';

export function useStorePath(): string {
  const pathname = usePathname();
  const match = /^\/s\/([^/]+)/.exec(pathname);
  return match ? `/s/${match[1]}` : '';
}
