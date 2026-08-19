'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, ReactNode } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { useStorefrontStore } from '@/lib/storefront-store';
import { useRouter, usePathname } from 'next/navigation';
import { useThemeStore } from '@/lib/theme-store';
import { Sun, Moon, User, Menu } from 'lucide-react';
import { StorefrontFooter } from './FooterTemplates';


function ThemeToggle({ color }: Readonly<{ color?: string }>) {
  const { mode, toggle } = useThemeStore();
  return (
    <button type="button" onClick={toggle} title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded hover:bg-black/5 transition-colors"
      style={color ? { color } : {}}>
      {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      {mode === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

function AvatarDropdown({ user, onLogout, base, showLogin, nav }: Readonly<{
  user: { email: string } | null;
  onLogout: () => void;
  base: string;
  showLogin: boolean;
  nav: { textColor?: string; bgColor?: string };
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initial = user?.email?.[0]?.toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors hover:opacity-80"
        style={{ borderColor: nav.textColor || '#d1d5db', color: nav.textColor || '#374151', backgroundColor: nav.bgColor || 'transparent' }}
        title="Account"
      >
        {initial ? <span className="text-xs font-bold">{initial}</span> : <User size={14} />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border shadow-lg z-50 overflow-hidden"
          style={{ backgroundColor: nav.bgColor || '#fff', borderColor: '#e5e7eb' }}>
          {user && (
            <div className="px-3 py-2 border-b text-xs truncate opacity-60" style={{ color: nav.textColor, borderColor: '#e5e7eb' }}>
              {user.email}
            </div>
          )}
          <div className="py-1">
            <ThemeToggle color={nav.textColor} />
          </div>
          {showLogin && (
            <div className="border-t py-1" style={{ borderColor: '#e5e7eb' }}>
              {user
                ? <>
                    <Link href={`${base}/profile`} onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                      style={{ color: nav.textColor }}>
                      Profile
                    </Link>
                    <Link href={`${base}/orders`} onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                      style={{ color: nav.textColor }}>
                      My Orders
                    </Link>
                    <button onClick={() => { onLogout(); setOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors border-t"
                      style={{ color: nav.textColor, borderColor: '#e5e7eb' }}>
                      Sign out
                    </button>
                  </>
                : <Link href={`${base}/login`} onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                    style={{ color: nav.textColor }}>
                    Sign in
                  </Link>
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CATALOG_URL = process.env.NEXT_PUBLIC_CATALOG_URL || 'http://localhost:3004';

export function imgUrl(src: string) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (src.startsWith('/uploads/')) return `${CATALOG_URL}${src}`;
  return src;
}

function useStorePath() {
  const pathname = usePathname();
  const match = /^\/s\/([^/]+)/.exec(pathname);
  return match ? `/s/${match[1]}` : '';
}

interface NavLink { label: string; href: string; enabled: boolean }

function useNavLinks(customLinks?: NavLink[]) {
  const base = useStorePath();
  if (customLinks && customLinks.length > 0) {
    return customLinks.filter(l => l.enabled).map(l => {
      const suffix = l.href === '/' ? '' : l.href;
      const href = l.href.startsWith('http') ? l.href : `${base}${suffix}`;
      return { label: l.label, href };
    });
  }
  return [
    { href: `${base}/`, label: 'Home' },
    { href: `${base}/products`, label: 'Products' },
    { href: `${base}/about`, label: 'About' },
    { href: `${base}/orders`, label: 'Orders' },
  ];
}

function useNavBranding() {
  const { store } = useStorefrontStore();
  const mode = useThemeStore(s => s.mode);
  const b = (store?.branding || {}) as Record<string, unknown>;

  // Pick light or dark theme colors based on current mode
  const themeBg = mode === 'dark'
    ? ((b.darkBg as string) || '#0a0a0a')
    : ((b.lightBg as string) || (b.themeBg as string) || '#ffffff');
  const themeText = mode === 'dark'
    ? ((b.darkText as string) || '#fafafa')
    : ((b.lightText as string) || (b.themeText as string) || '#171717');
  const themeAccent = mode === 'dark'
    ? ((b.darkAccent as string) || '#6366f1')
    : ((b.lightAccent as string) || (b.themeAccent as string) || '#4f46e5');

  return {
    // Nav-specific colors take priority over theme colors
    bgColor: (b.navBgColor as string) || themeBg,
    textColor: (b.navTextColor as string) || themeText,
    accentColor: (b.navAccentColor as string) || themeAccent,
    showCart: b.navShowCart !== false,
    showLogin: b.navShowLogin !== false,
    menuSide: (b.navMobileMenuSide as string) === 'left' ? 'left' : 'right',
    navLinks: (b.navLinks as NavLink[] | undefined),
    pageBg: themeBg,
    pageText: themeText,
    logoUrl: (b.logoUrl as string) || null,
    brandMode: (b.navBrandMode as string) || 'logo',
  };
}

// Renders the nav brand per the merchant's choice: logo only, store name only, or both.
// Falls back to the store name when logo-only is chosen but no logo is uploaded.
function BrandMark({ nav, storeName }: Readonly<{ nav: ReturnType<typeof useNavBranding>; storeName: string }>) {
  const hasLogo = !!nav.logoUrl;
  const logo = hasLogo ? <img src={imgUrl(nav.logoUrl as string)} alt={storeName} className="h-8 w-auto object-contain" /> : null;
  if (nav.brandMode === 'text' || !hasLogo) return <>{storeName}</>;
  if (nav.brandMode === 'both') return <span className="flex items-center gap-2">{logo}<span className="truncate">{storeName}</span></span>;
  return logo;
}

function MobileMenu({ open, onClose, links, cartCount, user, onLogout, nav }: Readonly<{
  open: boolean; onClose: () => void;
  links: { href: string; label: string }[];
  cartCount: number; user: { email: string } | null;
  onLogout: () => void;
  nav: ReturnType<typeof useNavBranding>;
}>) {
  const base = useStorePath();
  if (!open) return null;
  const isLeft = nav.menuSide === 'left';
  const cartStyle = nav.accentColor ? { backgroundColor: nav.accentColor, color: '#fff' } : {};
  return (
    <div className="fixed inset-0 z-50 flex" style={{ justifyContent: isLeft ? 'flex-start' : 'flex-end' }}>
      <button type="button" className="absolute inset-0 bg-black/60 cursor-default" aria-label="Close menu" onClick={onClose} />
      <div className="relative w-64 bg-white shadow-xl flex flex-col"
        style={nav.bgColor ? { backgroundColor: nav.bgColor } : {}}>
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold" style={nav.textColor ? { color: nav.textColor } : {}}>Menu</span>
          <button type="button" onClick={onClose} className="text-2xl leading-none" aria-label="Close"
            style={nav.textColor ? { color: nav.textColor } : {}}>×</button>
        </div>
        <nav className="flex-1 flex flex-col p-4 gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={onClose}
              className="py-3 px-2 text-base border-b border-neutral-100 hover:opacity-75"
              style={nav.textColor ? { color: nav.textColor } : { color: '#404040' }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-2">
          {nav.showCart && (
            <Link href={`${base}/cart`} onClick={onClose}
              className="flex items-center justify-between w-full py-2 px-3 rounded-lg"
              style={cartStyle.backgroundColor ? cartStyle : { backgroundColor: '#000', color: '#fff' }}>
              <span>🛒 Cart</span>
              {cartCount > 0 && <span className="bg-white text-black text-xs rounded-full px-2">{cartCount}</span>}
            </Link>
          )}
          {nav.showLogin && (user
            ? <button type="button" onClick={() => { onLogout(); onClose(); }} className="w-full py-2 text-sm text-neutral-500">Logout</button>
            : <Link href={`${base}/login`} onClick={onClose} className="block w-full py-2 text-center text-sm text-neutral-600">Sign in</Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR SHELL ───────────────────────────────────────────────────────────
interface SidebarShellProps { children: ReactNode; sidebarContent?: ReactNode }
export function SidebarShell({ children, sidebarContent }: Readonly<SidebarShellProps>) {
  const { store, user, clearAuth } = useStorefrontStore();
  const { items } = useCartStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = items.reduce((s, i) => s + i.qty, 0);
  const base = useStorePath();
  const nav = useNavBranding();
  const navLinks = useNavLinks(nav.navLinks);
  const handleLogout = () => { clearAuth(); router.push(`${base}/login`); };
  const headerStyle = nav.bgColor ? { backgroundColor: nav.bgColor } : {};
  const textStyle = nav.textColor ? { color: nav.textColor } : {};
  const accentStyle = nav.accentColor
    ? { backgroundColor: nav.accentColor, color: '#fff' }
    : { backgroundColor: '#000', color: '#fff' };

  return (
    <div className="flex min-h-screen transition-colors duration-200"
      style={{ backgroundColor: nav.pageBg || '#f9fafb', color: nav.pageText || '#171717' }}>
      <aside className="hidden lg:flex w-60 min-h-screen border-r flex-col shrink-0 transition-colors duration-200"
        style={{ backgroundColor: nav.bgColor || nav.pageBg || '#fff' }}>
        <div className="p-5 border-b">
          <Link href={`${base}/`} className="text-lg font-bold block" style={textStyle}>
            <BrandMark nav={nav} storeName={store?.name || 'Shop'} />
          </Link>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1 text-sm">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className="py-2 px-3 rounded hover:bg-neutral-100 font-medium"
              style={textStyle}>
              {l.label}
            </Link>
          ))}
          {sidebarContent && <div className="mt-4 border-t pt-4">{sidebarContent}</div>}
          {nav.showCart && (
            <Link href={`${base}/cart`} className="flex items-center justify-between py-2 px-3 rounded mt-2"
              style={accentStyle}>
              <span>🛒 Cart</span>
              {cartCount > 0 && <span className="bg-white text-black text-xs rounded-full px-1.5">{cartCount}</span>}
            </Link>
          )}
        </nav>
        {nav.showLogin && (
          <div className="p-4 border-t flex flex-col gap-2 text-sm">
            {user
              ? <button type="button" onClick={handleLogout} className="py-1 px-3 text-neutral-500 hover:text-black text-xs">Logout</button>
              : <Link href={`${base}/login`} className="py-1 px-3 text-center text-neutral-500 hover:text-black text-xs">Sign in</Link>}
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-40 border-b flex items-center px-4 h-14 gap-3"
          style={headerStyle.backgroundColor ? headerStyle : { backgroundColor: '#fff' }}>
          {nav.menuSide === 'left' && (
            <button type="button" onClick={() => setMenuOpen(true)} className="shrink-0 p-1" style={textStyle} aria-label="Open menu">
              <Menu size={20} />
            </button>
          )}
          <Link href={`${base}/`} className="font-bold text-base truncate max-w-[180px] flex-1" style={textStyle}>
            <BrandMark nav={nav} storeName={store?.name || 'Shop'} />
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            {nav.showCart && (
              <Link href={`${base}/cart`} className="relative">
                <span className="text-xl">🛒</span>
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
              </Link>
            )}
            <AvatarDropdown user={user} onLogout={handleLogout} base={base} showLogin={nav.showLogin} nav={nav} />
            {nav.menuSide !== 'left' && (
              <button type="button" onClick={() => setMenuOpen(true)} className="shrink-0 p-1" style={textStyle} aria-label="Open menu">
                <Menu size={20} />
              </button>
            )}
          </div>
        </header>
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={navLinks} cartCount={cartCount} user={user} onLogout={handleLogout} nav={nav} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
        <StorefrontFooter />
      </div>
    </div>
  );
}

// ─── TOPNAV SHELL ─────────────────────────────────────────────────────────────
export function TopnavShell({ children }: Readonly<{ children: ReactNode }>) {
  const { store, user, clearAuth } = useStorefrontStore();
  const { items } = useCartStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = items.reduce((s, i) => s + i.qty, 0);
  const base = useStorePath();
  const nav = useNavBranding();
  const navLinks = useNavLinks(nav.navLinks);
  const handleLogout = () => { clearAuth(); router.push(`${base}/login`); };
  const headerStyle = nav.bgColor ? { backgroundColor: nav.bgColor } : { backgroundColor: '#fff' };
  const textStyle = nav.textColor ? { color: nav.textColor } : {};
  const accentStyle = nav.accentColor
    ? { backgroundColor: nav.accentColor, color: '#fff' }
    : { backgroundColor: '#000', color: '#fff' };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: nav.pageBg || '#fff', color: nav.pageText || '#171717' }}>
      <header className="sticky top-0 z-50 border-b shadow-sm" style={headerStyle}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          {nav.menuSide === 'left' && (
            <button type="button" onClick={() => setMenuOpen(true)} className="md:hidden shrink-0 p-1" style={textStyle} aria-label="Open menu">
              <Menu size={20} />
            </button>
          )}
          <Link href={`${base}/`} className="font-bold text-lg shrink-0 truncate max-w-[150px] sm:max-w-none" style={textStyle}>
            <BrandMark nav={nav} storeName={store?.name || 'Shop'} />
          </Link>
          <nav className="hidden md:flex items-center gap-1 flex-1 text-sm">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} className="px-3 py-1.5 rounded hover:opacity-75" style={textStyle}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {nav.showCart && (
              <Link href={`${base}/cart`} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm hover:opacity-90"
                style={accentStyle}>
                🛒 {cartCount > 0 && <span className="bg-white text-black text-xs rounded-full px-1.5 font-bold">{cartCount}</span>}
              </Link>
            )}
            <AvatarDropdown user={user} onLogout={handleLogout} base={base} showLogin={nav.showLogin} nav={nav} />
          </div>
          <div className="flex md:hidden items-center gap-3 ml-auto">
            {nav.showCart && (
              <Link href={`${base}/cart`} className="relative">
                <span className="text-xl">🛒</span>
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
              </Link>
            )}
            <AvatarDropdown user={user} onLogout={handleLogout} base={base} showLogin={nav.showLogin} nav={nav} />
            {nav.menuSide !== 'left' && (
              <button type="button" onClick={() => setMenuOpen(true)} className="shrink-0 p-1" style={textStyle} aria-label="Open menu">
                <Menu size={20} />
              </button>
            )}
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={navLinks} cartCount={cartCount} user={user} onLogout={handleLogout} nav={nav} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  );
}

// ─── CARD SHELL ──────────────────────────────────────────────────────────────
export function CardShell({ children }: Readonly<{ children: ReactNode }>) {
  const { store, user, clearAuth } = useStorefrontStore();
  const { items } = useCartStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = items.reduce((s, i) => s + i.qty, 0);
  const base = useStorePath();
  const nav = useNavBranding();
  const navLinks = useNavLinks(nav.navLinks);
  const handleLogout = () => { clearAuth(); router.push(`${base}/login`); };
  const headerStyle = nav.bgColor
    ? { backgroundColor: nav.bgColor }
    : { backgroundColor: 'rgba(255,255,255,0.8)' };
  const textStyle = nav.textColor ? { color: nav.textColor } : {};
  const accentStyle = nav.accentColor
    ? { backgroundColor: nav.accentColor, color: '#fff' }
    : { backgroundColor: '#4f46e5', color: '#fff' };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: nav.pageBg || 'linear-gradient(135deg,#f5f7fa 0%,#e8ecf1 100%)', color: nav.pageText || undefined }}>
      <header className="backdrop-blur border-b sticky top-0 z-50" style={headerStyle}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {nav.menuSide === 'left' && (
            <button type="button" onClick={() => setMenuOpen(true)} className="md:hidden shrink-0 p-1" style={textStyle} aria-label="Open menu">
              <Menu size={20} />
            </button>
          )}
          <Link href={`${base}/`} className="font-extrabold text-lg tracking-tight shrink-0 truncate max-w-[150px] sm:max-w-none" style={textStyle}>
            <BrandMark nav={nav} storeName={store?.name || 'Shop'} />
          </Link>
          <nav className="hidden md:flex items-center gap-1 flex-1 text-sm">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} className="px-3 py-1.5 rounded-full hover:bg-neutral-100 hover:opacity-75" style={textStyle}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {nav.showCart && (
              <Link href={`${base}/cart`} className="flex items-center gap-1 px-4 py-1.5 rounded-full hover:opacity-90"
                style={accentStyle}>
                🛒 {cartCount > 0 && <span className="bg-white text-xs rounded-full px-1.5 font-bold" style={{ color: nav.accentColor || '#4f46e5' }}>{cartCount}</span>}
              </Link>
            )}
            <AvatarDropdown user={user} onLogout={handleLogout} base={base} showLogin={nav.showLogin} nav={nav} />
          </div>
          <div className="flex md:hidden items-center gap-3 ml-auto">
            {nav.showCart && (
              <Link href={`${base}/cart`} className="relative">
                <span className="text-xl">🛒</span>
                {cartCount > 0 && <span className="absolute -top-1 -right-1 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center"
                  style={accentStyle}>{cartCount}</span>}
              </Link>
            )}
            <AvatarDropdown user={user} onLogout={handleLogout} base={base} showLogin={nav.showLogin} nav={nav} />
            {nav.menuSide !== 'left' && (
              <button type="button" onClick={() => setMenuOpen(true)} className="shrink-0 p-1" style={textStyle} aria-label="Open menu">
                <Menu size={20} />
              </button>
            )}
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={navLinks} cartCount={cartCount} user={user} onLogout={handleLogout} nav={nav} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
