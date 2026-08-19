'use client';

import { ReactNode } from 'react';
import { TemplateProvider } from '@/lib/template-context';
import { StoreHeadInjector } from '@/components/StoreHeadInjector';

/** Resolves the store from hostname or /s/[slug] on every page, including custom domains. */
export function StoreProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <TemplateProvider>
      <StoreHeadInjector />
      {children}
    </TemplateProvider>
  );
}
