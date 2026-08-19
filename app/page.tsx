'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useTemplate, useCurrency } from '@/lib/template-context';
import { useShopData } from '@/lib/use-shop-data';
import { useCartStore } from '@/lib/cart-store';
import { useStorefrontStore } from '@/lib/storefront-store';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { imgUrl } from '@/components/templates/TemplateShells';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { productPath } from '@/lib/slug';

function useStorePath() {
  const pathname = usePathname();
  const match = /^\/s\/([^/]+)/.exec(pathname);
  return match ? `/s/${match[1]}` : '';
}

interface Slide { image: string; link: string }

function SlidingHero({ slides, base }: Readonly<{ slides: Slide[]; base: string }>) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (idx: number) => setCurrent((idx + slides.length) % slides.length);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % slides.length), 4000);
  };

  useEffect(() => {
    if (slides.length <= 1) return;
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div className="relative w-full overflow-hidden select-none" style={{ aspectRatio: '16/5', minHeight: 160 }}>
      {/* Slides */}
      {slides.map((s, i) => {
        const isActive = i === current;
        const rawLink = s.link || '';
        let slideHref: string | null = null;
        if (rawLink) { slideHref = rawLink.startsWith('http') ? rawLink : `${base}${rawLink}`; }
        return (
          <div key={`${s.image.slice(-8)}-${i}`}
            className={`absolute inset-0 transition-opacity duration-700 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <img src={imgUrl(s.image)} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
            {slideHref && (
              <a href={slideHref} className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors cursor-pointer"
                aria-label={`Go to ${slideHref}`} />
            )}
          </div>
        );
      })}

      {/* Prev / Next arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={() => { go(current - 1); resetTimer(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            aria-label="Previous">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => { go(current + 1); resetTimer(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            aria-label="Next">
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {slides.map((s, i) => (
            <button key={`dot-${s.image.slice(-6)}-${i}`} onClick={() => { go(i); resetTimer(); }}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`}
              aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarCategories() {
  const { categories, category, setCategory } = useShopData();
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">Categories</p>
      <button onClick={() => setCategory('')} className={`text-left py-1 px-2 rounded ${!category ? 'bg-black text-white' : 'hover:bg-neutral-100 text-neutral-700'}`}>All</button>
      {categories.map((c) => (
        <button key={c.id} onClick={() => setCategory(c.id)} className={`text-left py-1 px-2 rounded ${category === c.id ? 'bg-black text-white' : 'hover:bg-neutral-100 text-neutral-700'}`}>{c.name}</button>
      ))}
    </div>
  );
}

const GRADIENT_CLASSES: Record<string, string> = {
  'indigo-purple': 'from-indigo-600 to-purple-700',
  'rose-orange':   'from-rose-500 to-orange-500',
  'teal-cyan':     'from-teal-500 to-cyan-400',
  'amber-red':     'from-amber-500 to-red-500',
  'green-blue':    'from-green-500 to-blue-600',
  'pink-violet':   'from-pink-500 to-violet-600',
  'slate-gray':    'from-slate-700 to-gray-900',
  'sky-indigo':    'from-sky-400 to-indigo-600',
};

function HeroSection({ storeName, branding, base }: Readonly<{ storeName: string; branding: Record<string, string>; base: string }>) {
  // Sliding hero takes priority if configured
  if (branding.heroType === 'sliding') {
    const slides: Slide[] = (() => { try { return JSON.parse(branding.heroSlides as unknown as string) as Slide[]; } catch { return (branding.heroSlides as unknown as Slide[]) || []; } })();
    if (slides.length > 0) return <SlidingHero slides={slides} base={base} />;
  }
  const heading = branding.heroHeading || storeName;
  const subtext = branding.heroSubtext || 'Discover our collection';
  const style = branding.heroStyle || 'dark';
  const bgImage = branding.heroBgImage || '';
  const gradientKey = branding.heroGradient || 'indigo-purple';
  const gradientClass = GRADIENT_CLASSES[gradientKey] || GRADIENT_CLASSES['indigo-purple'];

  // Theme colors
  const darkBg = branding.darkBg || '#0a0a0a';
  const darkText = branding.darkText || '#fafafa';
  const darkAccent = branding.darkAccent || '#6366f1';
  const lightBg = branding.lightBg || branding.themeBg || '#ffffff';
  const lightText = branding.lightText || branding.themeText || '#171717';
  const lightAccent = branding.lightAccent || branding.themeAccent || '#000000';

  if (style === 'image' && bgImage) {
    return (
      <div className="relative py-24 text-center" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-white px-4">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{heading}</h1>
          <p className="text-neutral-300 mb-8 text-lg">{subtext}</p>
          <Link href={`${base}/products`} className="bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-neutral-100">Shop Now</Link>
        </div>
      </div>
    );
  }
  if (style === 'gradient') {
    return (
      <div className={`bg-gradient-to-br ${gradientClass} text-white py-20 text-center px-4`}>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">{heading}</h1>
        <p className="text-white/80 mb-8">{subtext}</p>
        <Link href={`${base}/products`} className="bg-white/20 hover:bg-white/30 text-white border border-white/40 font-semibold px-8 py-3 rounded-full backdrop-blur-sm">Shop Now</Link>
      </div>
    );
  }
  if (style === 'light') {
    return (
      <div className="py-16 text-center px-4 border-b" style={{ backgroundColor: lightBg, color: lightText }}>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">{heading}</h1>
        <p className="mb-8 opacity-60">{subtext}</p>
        <Link href={`${base}/products`} className="font-semibold px-8 py-3 rounded-full border-2 hover:opacity-80" style={{ borderColor: lightAccent, color: lightAccent }}>Shop Now</Link>
      </div>
    );
  }
  // dark (default)
  return (
    <div className="py-20 text-center px-4" style={{ backgroundColor: darkBg, color: darkText }}>
      <h1 className="text-4xl sm:text-5xl font-bold mb-4">{heading}</h1>
      <p className="mb-8 opacity-60">{subtext}</p>
      <Link href={`${base}/products`} className="font-semibold px-8 py-3 rounded-full border-2 hover:opacity-80" style={{ borderColor: darkAccent, color: darkAccent }}>Shop Now</Link>
    </div>
  );
}

// ─── Section display components ────────────────────────────────────────────

interface SizeConfig { card: string; circle: string; rect: string }

function CategorySection({ categories, style, base, accent, products, sizeConfig, categoryImages, align }: Readonly<{
  categories: { id: string; name: string }[];
  style: string; base: string; accent: string;
  products: SectionProduct[];
  sizeConfig?: SizeConfig;
  categoryImages?: Record<string, string>;
  align?: string;
}>) {
  if (!categories.length) return null;
  const sz = sizeConfig ?? { card: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', circle: 'w-20 h-20', rect: 'w-24 h-32' };

  const categoryImage = (catId: string): string | null =>
    categoryImages?.[catId] ||
    products.find(p => p.category && (p.category as unknown as { id: string }).id === catId && p.images?.[0])?.images?.[0] ||
    null;

  if (style === 'circle') return (
    <div className="flex flex-wrap gap-6 justify-center">
      {categories.map(c => {
        const img = categoryImage(c.id);
        return (
          <Link key={c.id} href={`${base}/products?category=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-2 group">
            <div className={`${sz.circle} rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-white shrink-0`}
              style={{ backgroundColor: accent || '#6366f1' }}>
              {img ? <img src={imgUrl(img)} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                : c.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-center max-w-[80px] truncate">{c.name}</span>
          </Link>
        );
      })}
    </div>
  );
  if (style === 'rectangle') return (
    <div className="flex flex-wrap gap-4 justify-center">
      {categories.map(c => {
        const img = categoryImage(c.id);
        return (
          <Link key={c.id} href={`${base}/products?category=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-2 group">
            <div className={`${sz.rect} rounded-xl overflow-hidden flex items-center justify-center text-2xl font-bold text-white shrink-0`}
              style={{ backgroundColor: accent || '#6366f1' }}>
              {img ? <img src={imgUrl(img)} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                : c.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-center max-w-[96px] truncate">{c.name}</span>
          </Link>
        );
      })}
    </div>
  );
  let gridAlign = '';
  if (align === 'center') gridAlign = 'justify-items-center';
  else if (align === 'right') gridAlign = 'justify-items-end';
  return (
    <div className={`grid ${sz.card} gap-4 ${gridAlign}`}>
      {categories.map(c => {
        const img = categoryImage(c.id);
        return (
          <Link key={c.id} href={`${base}/products?category=${encodeURIComponent(c.name)}`}
            className="rounded-2xl overflow-hidden border hover:shadow-md transition-shadow flex flex-col"
            style={{ backgroundColor: accent ? `${accent}20` : '#f5f5f5' }}>
            <div className="aspect-[4/3] bg-neutral-100 overflow-hidden flex items-center justify-center text-3xl font-bold text-white"
              style={{ backgroundColor: img ? undefined : (accent || '#6366f1') }}>
              {img
                ? <img src={imgUrl(img)} alt={c.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                : c.name.charAt(0).toUpperCase()}
            </div>
            <div className="p-3 flex items-center justify-center">
              <span className="text-sm font-semibold text-center">{c.name}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

type SectionProduct = { id: string; name: string; price: number; stock: number; images: string[]; category?: { name: string } };

function ProductSection({ products, style, base, symbol, onAdd, sizeConfig }: Readonly<{
  products: SectionProduct[]; style: string; base: string; symbol: string;
  onAdd: (p: SectionProduct) => void;
  sizeConfig?: SizeConfig;
}>) {
  const { items, updateQty } = useCartStore();
  if (!products.length) return null;
  const sz = sizeConfig ?? { card: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', circle: 'w-24 h-24', rect: 'w-28 h-40' };
  if (style === 'circle') return (
    <div className="flex flex-wrap gap-6 justify-center">
      {products.map(p => (
        <Link key={p.id} href={productPath(base, p)} className="flex flex-col items-center gap-2 group">
          <div className={`${sz.circle} rounded-full overflow-hidden bg-neutral-100 shrink-0`}>
            {p.images?.[0] ? <img src={imgUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
          </div>
          <span className="text-xs font-medium text-center line-clamp-2">{p.name}</span>
          <span className="text-xs font-bold">{symbol}{p.price.toFixed(2)}</span>
        </Link>
      ))}
    </div>
  );
  if (style === 'rectangle') return (
    <div className="flex flex-wrap gap-4 justify-center">
      {products.map(p => (
        <Link key={p.id} href={productPath(base, p)} className="flex flex-col items-center gap-2 group">
          <div className={`${sz.rect} rounded-xl overflow-hidden bg-neutral-100`}>
            {p.images?.[0] ? <img src={imgUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
          </div>
          <span className="text-xs font-medium text-center line-clamp-2">{p.name}</span>
          <span className="text-xs font-bold">{symbol}{p.price.toFixed(2)}</span>
        </Link>
      ))}
    </div>
  );
  return (
    <div className={`grid ${sz.card} gap-4`}>
      {products.map(p => (
        <div key={p.id} className="border rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
          <Link href={productPath(base, p)} className="block aspect-[4/3] bg-neutral-100 overflow-hidden">
            {p.images?.[0] ? <img src={imgUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
          </Link>
          <div className="p-3 flex flex-col gap-1 flex-1">
            {p.category && <span className="text-xs text-neutral-400">{p.category.name}</span>}
            <Link href={productPath(base, p)}><p className="font-medium text-sm line-clamp-1 hover:underline">{p.name}</p></Link>
            <div className="flex items-center justify-between mt-auto pt-2">
              <span className="font-bold">{symbol}{p.price.toFixed(2)}</span>
              {p.stock > 0 && (() => {
                const qty = items.find(i => i.productId === p.id)?.qty ?? 0;
                return qty > 0
                  ? <div className="flex items-center gap-1 border rounded-full overflow-hidden text-xs">
                      <button type="button" onClick={() => updateQty(p.id, qty - 1)} className="px-2.5 py-1 hover:bg-neutral-100 font-bold">−</button>
                      <span className="px-1.5 font-semibold min-w-[1.5rem] text-center">{qty}</span>
                      <button type="button" onClick={() => qty < p.stock && onAdd(p)} disabled={qty >= p.stock} className="px-2.5 py-1 hover:bg-neutral-100 font-bold disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                    </div>
                  : <button type="button" onClick={() => onAdd(p)} className="text-xs bg-black text-white px-3 py-1 rounded-full hover:bg-neutral-800">Add</button>;
              })()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function isTruthy(val: unknown): boolean {
  return val === true || val === 'true';
}

function sectionAlign(align: unknown): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function sectionItemSize(size: unknown): { card: string; circle: string; rect: string } {
  const SCALE: Record<number, { card: string; circle: string; rect: string }> = {
    1: { card: 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-8', circle: 'w-12 h-12', rect: 'w-16 h-24' },
    2: { card: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6', circle: 'w-16 h-16', rect: 'w-20 h-28' },
    3: { card: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', circle: 'w-24 h-24', rect: 'w-28 h-40' },
    4: { card: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', circle: 'w-28 h-28', rect: 'w-36 h-48' },
    5: { card: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2', circle: 'w-36 h-36', rect: 'w-44 h-60' },
  };
  if (size === 'sm') return SCALE[2];
  if (size === 'lg') return SCALE[4];
  if (size === 'md') return SCALE[3];
  const n = Number(size);
  return SCALE[n] ?? SCALE[3];
}

function HomeSections({ branding, allProducts, allCategories, base, symbol, addItem }: Readonly<{
  branding: Record<string, unknown>;
  allProducts: SectionProduct[];
  allCategories: { id: string; name: string; _count?: { products: number } }[];
  base: string; symbol: string;
  addItem: (item: { productId: string; name: string; price: number; qty: number }) => void;
}>) {
  const accent = (branding.lightAccent || branding.themeAccent || '#6366f1') as string;

  const parseIds = (val: unknown): string[] => {
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
    return [];
  };

  const newArrivalIds = parseIds(branding.newArrivalIds);
  const featuredIds = parseIds(branding.featuredIds);

  const newArrivalProducts = newArrivalIds.length
    ? newArrivalIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as SectionProduct[]
    : allProducts.slice(0, 8);

  const featuredProducts = featuredIds.length
    ? featuredIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as SectionProduct[]
    : allProducts.slice(0, 8);

  // Filter out categories with no products
  const nonEmptyCategories = allCategories.filter(c =>
    (c._count?.products ?? allProducts.filter(p => (p as { category?: { id: string } }).category?.id === c.id).length) > 0
  );

  const onAdd = (p: SectionProduct) => addItem({ productId: p.id, name: p.name, price: p.price, qty: 1 });

  const makeSection = (show: unknown, title: string, desc: unknown, align: unknown, content: React.JSX.Element | null) => {
    if (!isTruthy(show) || !content) return null;
    const textAlign = sectionAlign(align);
    const isCenter = align === 'center';
    const isRight = align === 'right';
    let contentCls = '';
    if (isCenter) contentCls = 'mx-auto';
    else if (isRight) contentCls = 'ml-auto mr-0';
    return (
      <section className="w-full px-4 py-8 max-w-7xl mx-auto">
        <div className={`mb-5 ${textAlign}`}>
          <h2 className="text-xl font-bold">{title}</h2>
          {typeof desc === 'string' && desc && <p className="text-sm text-neutral-500 mt-1">{desc}</p>}
        </div>
        <div className={`w-full ${contentCls}`}>
          <div className="w-full">{content}</div>
        </div>
      </section>
    );
  };

  return (
    <>
      {makeSection(branding.showCategories, 'Shop by Category', branding.categoriesDescription, branding.categoriesAlign,
        nonEmptyCategories.length > 0 ? <CategorySection categories={nonEmptyCategories} style={(branding.categoriesStyle as string) || 'cards'} base={base} accent={accent} products={allProducts} sizeConfig={sectionItemSize(branding.categoriesSize)} categoryImages={(branding.categoryImages as Record<string, string>) || {}} align={branding.categoriesAlign as string} /> : null
      )}
      {makeSection(branding.showNewArrivals, 'New Arrivals', branding.newArrivalsDescription, branding.newArrivalsAlign,
        newArrivalProducts.length > 0 ? <ProductSection products={newArrivalProducts} style={(branding.newArrivalsStyle as string) || 'cards'} base={base} symbol={symbol} onAdd={onAdd} sizeConfig={sectionItemSize(branding.newArrivalsSize)} /> : null
      )}
      {makeSection(branding.showFeatured, 'Featured', branding.featuredDescription, branding.featuredAlign,
        featuredProducts.length > 0 ? <ProductSection products={featuredProducts} style={(branding.featuredStyle as string) || 'cards'} base={base} symbol={symbol} onAdd={onAdd} sizeConfig={sectionItemSize(branding.featuredSize)} /> : null
      )}
    </>
  );
}

export default function HomePage() {
  const template = useTemplate();
  const { store } = useStorefrontStore();
  const { products, categories } = useShopData();
  const { addItem } = useCartStore();
  const { symbol } = useCurrency();
  const base = useStorePath();
  const branding = (store?.branding || {}) as Record<string, unknown>;
  const storeName = store?.name || 'Welcome';

  const homeSections = (
    <HomeSections
      branding={branding}
      allProducts={products}
      allCategories={categories}
      base={base}
      symbol={symbol}
      addItem={addItem}
    />
  );

  const b = branding as Record<string, string>;

  if (template === 'sidebar') {
    return (
      <TemplateWrapper sidebar={<SidebarCategories />}>
        <div className="rounded-2xl bg-neutral-900 text-white p-8 mb-8 relative overflow-hidden">
          {b.heroBgImage && (
            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${b.heroBgImage})` }} />
          )}
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{b.heroHeading || storeName}</h1>
            <p className="text-neutral-400 text-sm mb-4">{b.heroSubtext || 'Discover our curated collection'}</p>
            <Link href={`${base}/products`} className="inline-block bg-white text-black font-semibold text-sm px-5 py-2 rounded-full hover:bg-neutral-100">Shop All →</Link>
          </div>
        </div>
        {homeSections}
      </TemplateWrapper>
    );
  }

  if (template === 'card') {
    return (
      <TemplateWrapper>
        <HeroSection storeName={storeName} branding={{ ...b, heroStyle: b.heroStyle || 'gradient' }} base={base} />
        {homeSections}
      </TemplateWrapper>
    );
  }

  // topnav / default
  return (
    <TemplateWrapper>
      <HeroSection storeName={storeName} branding={b} base={base} />
      {homeSections}
    </TemplateWrapper>
  );
}
