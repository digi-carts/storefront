import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useCartStore } from './cart-store';
import { canonicalStoreSlug } from './store-domain';

interface StoreConfig {
  id: string;
  name: string;
  subdomain: string;
  template: string;
  branding: Record<string, string>;
  currency?: string;
}

interface AuthState {
  user: { id: string; email: string; role: string } | null;
  accessToken: string | null;
  store: StoreConfig | null;
  setAuth: (user: AuthState['user'], accessToken: string, refreshToken: string) => void;
  setStore: (store: StoreConfig) => void;
  clearAuth: () => void;
}

// Derive the store slug from the current URL so auth is isolated per store
function getStoreSlug(): string {
  if (typeof window === 'undefined') return 'default';
  const pathMatch = /^\/s\/([^/]+)/.exec(window.location.pathname);
  if (pathMatch) return canonicalStoreSlug(pathMatch[1]);
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'default';
  return canonicalStoreSlug(host);
}

export function sfKey(base: string): string {
  return `${base}:${getStoreSlug()}`;
}

// Custom Zustand storage that scopes every key to the current store slug
const storeAwareStorage = {
  getItem: (name: string) => {
    try { return localStorage.getItem(sfKey(name)); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(sfKey(name), value); } catch { /* ignore */ }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(sfKey(name)); } catch { /* ignore */ }
  },
};

export const useStorefrontStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      store: null,
      setAuth: (user, accessToken, refreshToken) => {
        const prevUser = get().user;
        const store = get().store;
        // Clear cart if switching to a different user
        if (prevUser?.id !== user?.id) {
          useCartStore.getState().clearForUser(user?.id ?? null, store?.id ?? null);
        }
        localStorage.setItem(sfKey('sf_accessToken'), accessToken);
        localStorage.setItem(sfKey('sf_refreshToken'), refreshToken);
        set({ user, accessToken });
      },
      setStore: (store) => set({ store }),
      clearAuth: () => {
        // Clear cart on logout
        useCartStore.getState().clearForUser(null, null);
        localStorage.removeItem(sfKey('sf_accessToken'));
        localStorage.removeItem(sfKey('sf_refreshToken'));
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: 'sf-auth',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => storeAwareStorage) : undefined,
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, store: s.store }) as AuthState,
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          localStorage.setItem(sfKey('sf_accessToken'), state.accessToken);
        }
      },
    }
  )
);
