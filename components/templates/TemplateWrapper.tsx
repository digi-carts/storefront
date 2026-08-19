'use client';

import { ReactNode, useMemo } from 'react';
import { useTemplate } from '@/lib/template-context';
import { useStorefrontStore } from '@/lib/storefront-store';
import { SidebarShell, TopnavShell, CardShell } from './TemplateShells';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export function TemplateWrapper({ children, sidebar }: Readonly<{ children: ReactNode; sidebar?: ReactNode }>) {
  const template = useTemplate();
  const { store } = useStorefrontStore();
  const b = (store?.branding || {}) as Record<string, string>;

  // Build CSS vars from theme branding — applied to the page wrapper
  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {};
    if (b.themeBg) vars['--theme-bg'] = b.themeBg;
    if (b.themeText) vars['--theme-text'] = b.themeText;
    if (b.themeAccent) vars['--theme-accent'] = b.themeAccent;
    return vars;
  }, [b.themeBg, b.themeText, b.themeAccent]);

  const hasCssVars = Object.keys(cssVars).length > 0;

  const content = (() => {
    if (template === 'sidebar') return <SidebarShell sidebarContent={sidebar}>{children}</SidebarShell>;
    if (template === 'card') return <CardShell>{children}</CardShell>;
    return <TopnavShell>{children}</TopnavShell>;
  })();

  if (!hasCssVars) return <>{content}<WhatsAppButton /></>;

  return (
    <div style={cssVars as React.CSSProperties}>
      {content}
      <WhatsAppButton />
    </div>
  );
}
