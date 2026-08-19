'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/cart-store';
import { useTemplate, useCurrency } from '@/lib/template-context';
import { useStorefrontStore } from '@/lib/storefront-store';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/ShareButton';
import { productPath } from '@/lib/slug';
import { usePathname } from 'next/navigation';

interface Spec { key: string; value: string }
interface Product { id: string; name: string; price: number; stock: number; images: string[]; description?: string; category?: { id: string; name: string }; specs?: Spec[] }

function useStorePath() {
  const pathname = usePathname();
  const match = /^\/s\/([^/]+)/.exec(pathname);
  return match ? `/s/${match[1]}` : '';
}

function SimilarItems({ product, symbol, isCard }: Readonly<{ product: Product; symbol: string; isCard: boolean }>) {
  const [items, setItems] = useState<Product[]>([]);
  const { addItem } = useCartStore();
  const base = useStorePath();
  const { store } = useStorefrontStore();

  useEffect(() => {
    if (!product.category?.id) return;
    api.get('/catalog/products', {
      headers: { 'x-store-id': store?.id || '' },
      params: { category: product.category.id, limit: 8 },
    }).then(r => {
      const similar = (r.data.products || []).filter((p: Product) => p.id !== product.id);
      setItems(similar.slice(0, 6));
    }).catch(() => {});
  }, [product.id, product.category?.id, store?.id]);

  if (!items.length) return null;

  return (
    <div className="mt-12">
      <h2 className={`text-xl font-bold mb-5 ${isCard ? 'text-indigo-900' : ''}`}>Similar Items</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(p => (
          <div key={p.id} className={`border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col ${isCard ? 'shadow-sm' : ''}`}>
            <Link href={productPath(base, p)} className="block aspect-square bg-neutral-100 overflow-hidden">
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
            </Link>
            <div className="p-3 flex flex-col gap-1 flex-1">
              <Link href={productPath(base, p)}>
                <p className="font-medium text-sm line-clamp-2 hover:underline">{p.name}</p>
              </Link>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className={`font-bold text-sm ${isCard ? 'text-indigo-700' : ''}`}>{symbol}{p.price.toFixed(2)}</span>
                {p.stock > 0 && (
                  <button type="button"
                    onClick={() => addItem({ productId: p.id, name: p.name, price: p.price, qty: 1 })}
                    className={`text-xs px-3 py-1 rounded-full ${isCard ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-black text-white hover:bg-neutral-800'}`}>
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const { addItem, items } = useCartStore();
  const template = useTemplate();
  const { symbol } = useCurrency();
  const { store } = useStorefrontStore();
  const isCard = template === 'card';
  const showSimilar = (store?.branding as Record<string, unknown>)?.showSimilarItems !== false;

  useEffect(() => {
    if (!store?.id) return;
    api.get(`/catalog/products/${id}`, {
      headers: { 'x-store-id': store.id },
    }).then((r) => {
      const p = r.data.product;
      setProduct(p);
      // Replace UUID in URL with name slug for clean sharing
      if (p?.name && typeof window !== 'undefined') {
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const clean = window.location.pathname.replace(id, slug) + window.location.search;
        window.history.replaceState({}, '', clean);
      }
    }).catch(() => {});
  }, [id, store?.id]);

  if (!product) return <TemplateWrapper><div className="p-12 text-neutral-400 text-center">Loading…</div></TemplateWrapper>;

  const images = product.images?.length ? product.images : [];

  const handleAdd = () => {
    const inCart = items.find(i => i.productId === product.id)?.qty ?? 0;
    const canAdd = Math.min(qty, product.stock - inCart);
    if (canAdd <= 0) return;
    addItem({ productId: product.id, name: product.name, price: product.price, qty: canAdd });
    setQty(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const detail = (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Image slideshow */}
      <div className="space-y-3">
        {/* Main image — click to zoom */}
        <button type="button" onClick={() => images[activeImg] && setZoomOpen(true)}
          className={`w-full aspect-square rounded-2xl overflow-hidden ${isCard ? 'shadow-lg' : 'border'} bg-neutral-100 flex items-center justify-center text-6xl cursor-zoom-in`}>
          {images[activeImg]
            ? <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            : '📦'
          }
        </button>

        {/* Zoom lightbox */}
        {zoomOpen && images[activeImg] && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setZoomOpen(false)}>
            <button className="absolute top-4 right-4 text-white text-3xl hover:text-neutral-300" aria-label="Close zoom">×</button>
            {images.length > 1 && (
              <button className="absolute left-4 text-white text-3xl hover:text-neutral-300"
                onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg - 1 + images.length) % images.length); }}
                aria-label="Previous">‹</button>
            )}
            <img src={images[activeImg]} alt={product.name}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()} />
            {images.length > 1 && (
              <button className="absolute right-4 text-white text-3xl hover:text-neutral-300"
                onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg + 1) % images.length); }}
                aria-label="Next">›</button>
            )}
            <div className="absolute bottom-4 text-white text-sm opacity-60">{activeImg + 1} / {images.length}</div>
          </div>
        )}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => {
              const activeBorder = isCard ? 'border-indigo-500' : 'border-black';
              const borderCls = i === activeImg ? activeBorder : 'border-transparent opacity-60 hover:opacity-100';
              return (
                <button key={img || i} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${borderCls}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-4">
        {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <ShareButton title={product.name} />
        </div>
        {product.description && <p className="text-neutral-600">{product.description}</p>}

        {/* Product specs */}
        {product.specs && product.specs.length > 0 && (
          <div className={`rounded-xl overflow-hidden border ${isCard ? 'border-indigo-100' : 'border-neutral-200'}`}>
            {product.specs.map((spec) => (
              <div key={spec.key} className="flex border-b border-neutral-100 last:border-0">
                <div className={`w-1/3 px-3 py-2 text-sm font-semibold shrink-0 ${isCard ? 'bg-indigo-50 text-indigo-800' : 'bg-neutral-50 text-neutral-700'}`}>
                  {spec.key}
                </div>
                <div className="flex-1 px-3 py-2 text-sm text-neutral-600 whitespace-pre-wrap">{spec.value}</div>
              </div>
            ))}
          </div>
        )}
        <p className={`text-3xl font-bold ${isCard ? 'text-indigo-700' : ''}`}>{symbol}{product.price.toFixed(2)}</p>
        {product.stock === 0 && <p className="text-red-500 font-medium text-sm">Out of stock</p>}
        {product.stock > 0 && product.stock <= 5 && (
          <p className="text-orange-500 font-medium text-sm">Only {product.stock} left!</p>
        )}
        {product.stock > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-full overflow-hidden">
              <button type="button" className="px-4 py-2 text-lg hover:bg-neutral-100" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="px-4 font-medium">{qty}</span>
              <button type="button" className="px-4 py-2 text-lg hover:bg-neutral-100" onClick={() => setQty(Math.min(product.stock, qty + 1))}>+</button>
            </div>
            {(() => {
              const inCart = items.find(i => i.productId === product.id)?.qty ?? 0;
              const available = product.stock - inCart;
              return available > 0 ? (
                <Button onClick={handleAdd} className={isCard ? 'bg-indigo-600 hover:bg-indigo-700 rounded-full px-8' : 'rounded-full px-8'}>
                  {added ? '✓ Added!' : 'Add to Cart'}
                </Button>
              ) : (
                <p className="text-orange-500 font-medium text-sm">Max quantity in cart</p>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TemplateWrapper>
      <div className={`mx-auto px-4 py-8 ${template === 'sidebar' ? 'max-w-3xl' : 'max-w-5xl'}`}>
        {detail}
        {showSimilar && <SimilarItems product={product} symbol={symbol} isCard={isCard} />}
      </div>
    </TemplateWrapper>
  );
}
