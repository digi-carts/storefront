'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { useStorefrontStore } from '@/lib/storefront-store';
import { useStorePath } from '@/lib/use-store-path';
import { Button } from '@/components/ui/button';
import { User, ShoppingCart, Package, LogOut, UserCircle } from 'lucide-react';

export function Header() {
  const { items } = useCartStore();
  const { store, user, clearAuth } = useStorefrontStore();
  const base = useStorePath();
  const router = useRouter();
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    clearAuth();
    router.push(`${base}/login`);
  };

  // Get initials from name or email
  const initials = user
    ? (user as { name?: string; email: string }).name
      ? (user as { name?: string }).name!.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      : user.email.slice(0, 2).toUpperCase()
    : null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={`${base}/`} className="font-bold text-lg">{store?.name || 'Shop'}</Link>
        <nav className="flex items-center gap-3">
          <Link href={`${base}/products`} className="text-sm text-neutral-600 hover:text-black">Products</Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Account menu"
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1">
                {initials ?? <User size={14} />}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-1 z-50">
                  <div className="px-4 py-2 border-b">
                    <p className="text-xs font-medium truncate">{(user as { name?: string }).name || user.email}</p>
                    {(user as { name?: string }).name && <p className="text-xs text-neutral-400 truncate">{user.email}</p>}
                  </div>
                  <Link href={`${base}/profile`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <UserCircle size={15} /> Profile
                  </Link>
                  <Link href={`${base}/orders`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <Package size={15} /> My Orders
                  </Link>
                  <button type="button" onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 border-t">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href={`${base}/login`} className="text-sm text-neutral-600 hover:text-black">Sign in</Link>
          )}

          <Link href={`${base}/cart`}>
            <Button variant="outline" size="sm" className="relative">
              <ShoppingCart size={15} />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
