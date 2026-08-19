import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

interface CartState {
  userId: string | null;
  storeId: string | null;
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  clearForUser: (userId: string | null, storeId: string | null) => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      userId: null,
      storeId: null,
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === item.productId);
        if (existing) {
          set({ items: items.map((i) => i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i) });
        } else {
          set({ items: [...items, item] });
        }
      },
      updateQty: (productId, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.productId !== productId) });
        } else {
          set({ items: get().items.map((i) => i.productId === productId ? { ...i, qty } : i) });
        }
      },
      removeItem: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      clear: () => set({ items: [] }),
      // Called on login/logout. On guest→login we MERGE (keep the guest cart and
      // adopt it for the user). We only wipe when switching between two different
      // logged-in users (or on logout). Each store is a separate origin, so the
      // persisted cart is already per-store.
      clearForUser: (newUserId, newStoreId) => {
        const { userId } = get();
        // Guest (no user yet) logging in → keep items, assign them to the user.
        if (userId === null && newUserId !== null) {
          set({ userId: newUserId, storeId: newStoreId });
          return;
        }
        // Different user (including logout to null) → start fresh.
        if (userId !== newUserId) {
          set({ items: [], userId: newUserId, storeId: newStoreId });
        }
      },
      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: 'sf-cart' }
  )
);
