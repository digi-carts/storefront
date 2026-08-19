'use client';

import { Suspense, useState, useEffect } from 'react';
import { useTemplate, useCurrency } from '@/lib/template-context';
import { useShopData, type Category } from '@/lib/use-shop-data';
import { useCartStore } from '@/lib/cart-store';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { InfiniteProductGrid } from '@/components/product/InfiniteProductGrid';
import { Input } from '@/components/ui/input';
import { imgUrl } from '@/components/templates/TemplateShells';
import { ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { productPath } from '@/lib/slug';

function useStorePath() {
  const pathname = usePathname();
  const match = /^\/s\/([^/]+)/.exec(pathname);
  return match ? `/s/${match[1]}` : '';
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc', label: 'Name A–Z' },
];

function SortSelect({ sort, setSort, accent = 'default' }: Readonly<{ sort: string; setSort: (v: string) => void; accent?: string }>) {
  return (
    <select value={sort} onChange={e => setSort(e.target.value)}
      className={`text-sm border rounded-full px-3 py-1.5 bg-white focus:outline-none ${accent === 'indigo' ? 'border-indigo-200 focus:border-indigo-400' : 'border-neutral-200 focus:border-black'}`}>
      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Tree node (recursive) ────────────────────────────────────────────────────
function CategoryNode({ node, category, setCategory, accent = 'black', depth = 0 }: Readonly<{
  node: Category; category: string; setCategory: (v: string) => void; accent?: string; depth?: number;
}>) {
  const [open, setOpen] = useState(false);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isActive = category === node.id;
  const activeCls = accent === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-black text-white';
  const baseCls = `flex items-center gap-1 w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${isActive ? activeCls : 'hover:bg-neutral-100 text-neutral-700'}`;

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-center gap-0.5">
        {hasChildren
          ? <button type="button" onClick={() => setOpen(o => !o)} className="shrink-0 text-neutral-400 hover:text-black p-0.5">
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          : <span className="w-4 shrink-0" />
        }
        <button type="button" onClick={() => setCategory(isActive ? '' : node.id)} className={baseCls}>
          {node.name}
        </button>
      </div>
      {hasChildren && open && (
        <div className="mt-0.5">
          {node.children!.map(child => (
            <CategoryNode key={child.id} node={child} category={category} setCategory={setCategory} accent={accent} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTree({ tree, category, setCategory, accent = 'black' }: Readonly<{
  tree: Category[]; category: string; setCategory: (v: string) => void; accent?: string;
}>) {
  const activeCls = accent === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-black text-white';
  return (
    <div className="flex flex-col gap-0.5">
      <button type="button" onClick={() => setCategory('')}
        className={`text-left px-2 py-1.5 rounded text-sm ${!category ? activeCls : 'hover:bg-neutral-100 text-neutral-700'}`}>
        All
      </button>
      {tree.map(node => (
        <CategoryNode key={node.id} node={node} category={category} setCategory={setCategory} accent={accent} />
      ))}
    </div>
  );
}

// ─── Category pills (flat with indent labels for subcategories) ───────────────
function CategoryPills({ tree, category, setCategory, accent = 'black' }: Readonly<{
  tree: Category[]; category: string; setCategory: (v: string) => void; accent?: string;
}>) {
  const activeCls = accent === 'indigo' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-black text-white border-black';

  const flatWithDepth: { id: string; label: string; depth: number }[] = [];
  const flatten = (nodes: Category[], depth: number) => {
    nodes.forEach(n => {
      flatWithDepth.push({ id: n.id, label: n.name, depth });
      if (n.children?.length) flatten(n.children, depth + 1);
    });
  };
  flatten(tree, 0);

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setCategory('')}
        className={`px-3 py-1 rounded-full text-sm border transition-all ${!category ? activeCls : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
        All
      </button>
      {flatWithDepth.map(({ id, label }) => (
        <button key={id} type="button" onClick={() => setCategory(id)}
          className={`px-3 py-1 rounded-full text-sm border transition-all ${category === id ? activeCls : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Mobile filter drawer ─────────────────────────────────────────────────────
function MobileFilterDrawer({ open, onClose, tree, category, setCategory, sort, setSort }: Readonly<{
  open: boolean; onClose: () => void;
  tree: Category[]; category: string; setCategory: (v: string) => void;
  sort: string; setSort: (v: string) => void;
}>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end md:hidden">
      <button className="absolute inset-0 bg-black/50 cursor-default" aria-label="Close filters" onClick={onClose} />
      <div className="relative w-72 bg-white flex flex-col h-full shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">Filter & Sort</span>
          <button onClick={onClose} className="text-2xl leading-none text-neutral-400 hover:text-black">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">Sort by</p>
            <div className="flex flex-col gap-1">
              {SORT_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setSort(o.value)}
                  className={`text-left px-3 py-2 rounded text-sm ${sort === o.value ? 'bg-black text-white' : 'hover:bg-neutral-100 text-neutral-700'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">Category</p>
            <CategoryTree tree={tree} category={category} setCategory={id => { setCategory(id); onClose(); }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card product ─────────────────────────────────────────────────────────────
function CardProduct({ p, base }: Readonly<{ p: ReturnType<typeof useShopData>['products'][0]; base: string }>) {
  const { items, addItem, updateQty } = useCartStore();
  const { symbol } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cartQty = mounted ? (items.find(i => i.productId === p.id)?.qty ?? 0) : 0;

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      <a href={productPath(base, p)} className="block aspect-[4/3] bg-neutral-100 overflow-hidden">
        {p.images?.[0]
          ? <img src={imgUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>}
      </a>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        {p.category && <span className="text-xs text-indigo-600 font-medium">{p.category.name}</span>}
        <a href={productPath(base, p)}><h3 className="font-semibold hover:underline line-clamp-1">{p.name}</h3></a>
        {p.description && <p className="text-sm text-neutral-500 line-clamp-2">{p.description}</p>}
        <div className="flex items-center justify-between mt-auto pt-2 border-t">
          <span className="font-bold text-lg">{symbol}{p.price.toFixed(2)}</span>
          {p.stock === 0 && <span className="text-xs text-neutral-400">Out of stock</span>}
          {p.stock > 0 && cartQty > 0 && (
            <div className="flex items-center gap-1 border rounded-full overflow-hidden text-xs">
              <button type="button" onClick={() => updateQty(p.id, cartQty - 1)} className="px-2.5 py-1 hover:bg-neutral-100 font-bold">−</button>
              <span className="px-1.5 font-semibold min-w-[1.5rem] text-center">{cartQty}</span>
              <button type="button" onClick={() => { if (cartQty < p.stock) addItem({ productId: p.id, name: p.name, price: p.price, qty: 1 }); }}
                disabled={cartQty >= p.stock}
                className={`px-2.5 py-1 font-bold ${cartQty >= p.stock ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-100'}`}>+</button>
            </div>
          )}
          {p.stock > 0 && cartQty === 0 && (
            <button type="button" onClick={() => addItem({ productId: p.id, name: p.name, price: p.price, qty: 1 })} className="bg-black text-white text-sm px-4 py-1.5 rounded-full hover:bg-neutral-800">Add</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function ProductsPageContent() {
  const template = useTemplate();
  const base = useStorePath();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { products, tree, search, setSearch, category, setCategory, sort, setSort, loadMore, hasMore, loadingMore, total } = useShopData();
  const [filterOpen, setFilterOpen] = useState(false);

  // Sync URL params → state on mount and param changes
  useEffect(() => {
    const catParam = searchParams.get('category') || '';
    const s = searchParams.get('search') || '';
    const srt = searchParams.get('sort') || 'newest';
    // category param is now a name — find ID from tree or pass name directly (backend handles both)
    const allCats = tree.flatMap(function flatten(c): typeof tree {
      return [c, ...(c.children?.flatMap(flatten) ?? [])];
    });
    const catId = catParam ? (allCats.find(c => c.name.toLowerCase() === catParam.toLowerCase())?.id || catParam) : '';
    if (catId !== category) setCategory(catId);
    if (s !== search) setSearch(s);
    if (srt !== sort) setSort(srt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tree]);

  // Update URL when filters change
  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${base}/products?${params.toString()}`, { scroll: false });
  };

  const handleSetCategory = (idOrName: string) => {
    // Find the category name from tree to use in URL (human-readable)
    const allCats = tree.flatMap(function flatten(c): typeof tree {
      return [c, ...(c.children?.flatMap(flatten) ?? [])];
    });
    const cat = allCats.find(c => c.id === idOrName || c.name === idOrName);
    const nameForUrl = cat?.name || idOrName;
    setCategory(idOrName);
    updateUrl('category', nameForUrl);
  };
  const handleSetSearch = (v: string) => { setSearch(v); updateUrl('search', v); };
  const handleSetSort = (v: string) => { setSort(v); updateUrl('sort', v); };

  const count = <p className="text-sm text-neutral-500">{total} products</p>;

  const topbar = (accent?: string) => (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Input placeholder="Search…" value={search} onChange={(e) => handleSetSearch(e.target.value)} className="max-w-xs h-9" />
      <div className="hidden md:block">
        <SortSelect sort={sort} setSort={handleSetSort} accent={accent} />
      </div>
      <button type="button" onClick={() => setFilterOpen(true)}
        className="md:hidden flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm text-neutral-600 hover:border-black">
        <SlidersHorizontal size={14} /> Filter & Sort
      </button>
      <div className="ml-auto hidden md:block">{count}</div>
    </div>
  );

  if (template === 'sidebar') {
    return (
      <TemplateWrapper sidebar={
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">Categories</p>
          <CategoryTree tree={tree} category={category} setCategory={handleSetCategory} />
          <p className="text-xs font-semibold text-neutral-400 uppercase mt-4 mb-2">Sort</p>
          <SortSelect sort={sort} setSort={handleSetSort} />
        </div>
      }>
        <MobileFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} tree={tree} category={category} setCategory={handleSetCategory} sort={sort} setSort={handleSetSort} />
        {topbar()}
        <div className="md:hidden mb-2">{count}</div>
        {products.length === 0
          ? <p className="text-neutral-400 py-12 text-center">No products found.</p>
          : <InfiniteProductGrid products={products} loadMore={loadMore} hasMore={hasMore} loadingMore={loadingMore} cols="grid-cols-2 lg:grid-cols-3" />
        }
      </TemplateWrapper>
    );
  }

  if (template === 'card') {
    return (
      <TemplateWrapper>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-extrabold">All Products</h1>
          </div>
          {topbar('indigo')}
          <div className="hidden md:block mb-4">
            <CategoryPills tree={tree} category={category} setCategory={handleSetCategory} accent="indigo" />
          </div>
          <div className="md:hidden mb-2">{count}</div>
          <MobileFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} tree={tree} category={category} setCategory={handleSetCategory} sort={sort} setSort={handleSetSort} />
          {products.length === 0
            ? <p className="text-neutral-400 py-12 text-center">No products found.</p>
            : <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => <CardProduct key={p.id} p={p} base={base} />)}
                </div>
                {loadingMore && <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-neutral-300 border-t-indigo-600 rounded-full animate-spin" /></div>}
                {!hasMore && products.length > 0 && <p className="text-center text-xs text-neutral-400 py-4">All {products.length} products loaded</p>}
              </>
          }
        </div>
      </TemplateWrapper>
    );
  }

  // topnav template
  return (
    <TemplateWrapper>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">All Products</h1>
        </div>
        {topbar()}
        <div className="hidden md:block mb-4">
          <CategoryPills tree={tree} category={category} setCategory={handleSetCategory} />
        </div>
        <div className="md:hidden mb-2">{count}</div>
        <MobileFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} tree={tree} category={category} setCategory={handleSetCategory} sort={sort} setSort={handleSetSort} />
        {products.length === 0
          ? <p className="text-neutral-400 py-12 text-center">No products found.</p>
          : <InfiniteProductGrid products={products} loadMore={loadMore} hasMore={hasMore} loadingMore={loadingMore} />
        }
      </div>
    </TemplateWrapper>
  );
}

export default function ProductsPage() {
  return <Suspense><ProductsPageContent /></Suspense>;
}
