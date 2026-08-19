'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/cart-store';
import { useCurrency } from '@/lib/template-context';
import { productPath } from '@/lib/slug';

interface Product {
  id: string; name: string; price: number; stock: number;
  images: string[]; description?: string; category?: { id: string; name: string };
}

function useStorePath() {
  const pathname = usePathname();
  const match = /^\/s\/([^/]+)/.exec(pathname);
  return match ? `/s/${match[1]}` : '';
}

export function ProductCard({ product }: Readonly<{ product: Product }>) {
  const { items, addItem, updateQty } = useCartStore();
  const { symbol } = useCurrency();
  const [imgIdx, setImgIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const base = useStorePath();
  const pPath = productPath(base, product);
  const images = product.images || [];

  useEffect(() => setMounted(true), []);

  const cartItem = items.find(i => i.productId === product.id);
  const qty = mounted ? (cartItem?.qty ?? 0) : 0;

  return (
    <div className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link href={pPath}>
        <div className="relative aspect-square bg-neutral-100 overflow-hidden">
          {images[imgIdx]
            ? <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center text-neutral-300 text-4xl">📦</div>
          }
          {images.length > 1 && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
              {images.map((img) => (
                <button key={img} type="button"
                  onMouseEnter={() => setImgIdx(images.indexOf(img))}
                  onClick={(e) => { e.preventDefault(); setImgIdx(images.indexOf(img)); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${images.indexOf(img) === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className="p-3 flex flex-col gap-1 flex-1">
        {product.category && (
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide truncate">
            {product.category.name}
          </span>
        )}
        <Link href={pPath}>
          <p className="font-medium text-sm hover:underline line-clamp-1">{product.name}</p>
        </Link>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="font-bold text-sm">{symbol}{product.price.toFixed(2)}</span>
          {product.stock === 0 && <Badge variant="secondary" className="text-xs">Out of stock</Badge>}
          {product.stock > 0 && qty > 0 && (
            <div className="flex items-center gap-1 border rounded-full overflow-hidden text-xs">
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQty(product.id, qty - 1); }}
                className="px-2.5 py-1 hover:bg-neutral-100 font-bold">−</button>
              <span className="px-1.5 font-semibold min-w-[1.5rem] text-center">{qty}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (qty < product.stock) addItem({ productId: product.id, name: product.name, price: product.price, qty: 1 }); }}
                disabled={qty >= product.stock}
                className={`px-2.5 py-1 font-bold ${qty >= product.stock ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-100'}`}>+</button>
            </div>
          )}
          {product.stock > 0 && qty === 0 && (
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ productId: product.id, name: product.name, price: product.price, qty: 1 }); }}
              className="bg-black text-white text-xs px-3 py-1.5 rounded-full hover:bg-neutral-800 transition-colors">
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
