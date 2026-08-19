'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';
import { useStorefrontStore } from './storefront-store';

interface ThemeState {
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      setMode: (mode) => set({ mode }),
      toggle: () => set({ mode: get().mode === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'sf-theme' }
  )
);

export function useThemeMode() { return useThemeStore(s => s.mode); }
export function useThemeToggle() { return useThemeStore(s => s.toggle); }

export function ThemeInjector() {
  const { store } = useStorefrontStore();
  const mode = useThemeStore(s => s.mode);
  const b = (store?.branding || {}) as Record<string, string>;

  // Update page title dynamically with store name
  useEffect(() => {
    if (store?.name) document.title = store.name;
  }, [store?.name]);

  // Update favicon dynamically from store logo
  useEffect(() => {
    const logoUrl = b.logoUrl || b.thumbnailUrl;
    if (!logoUrl) return;
    const existing = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    const link = existing || document.createElement('link');
    link.rel = 'icon';
    link.type = logoUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
    link.href = logoUrl;
    if (!existing) document.head.appendChild(link);
  }, [b.logoUrl, b.thumbnailUrl]);

  useEffect(() => {
    const root = document.documentElement;

    const bg = mode === 'dark'
      ? (b.darkBg || '#0a0a0a')
      : (b.lightBg || b.themeBg || '#ffffff');

    const text = mode === 'dark'
      ? (b.darkText || '#fafafa')
      : (b.lightText || b.themeText || '#171717');

    const accent = mode === 'dark'
      ? (b.darkAccent || '#6366f1')
      : (b.lightAccent || b.themeAccent || '#4f46e5');

    root.style.setProperty('--sf-bg', bg);
    root.style.setProperty('--sf-text', text);
    root.style.setProperty('--sf-accent', accent);
    root.style.setProperty('--sf-mode', mode);
    document.body.style.backgroundColor = bg;
    document.body.style.color = text;
    document.body.style.transition = 'background-color 0.2s, color 0.2s';
  }, [mode, b.lightBg, b.lightText, b.lightAccent, b.darkBg, b.darkText, b.darkAccent, b.themeBg, b.themeText, b.themeAccent]);

  return null;
}
