'use client';

import { useEffect, useRef } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { Product } from '@/lib/use-shop-data';

interface Props {
  products: Product[];
  loadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  cols?: string;
}

export function InfiniteProductGrid({ products, loadMore, hasMore, loadingMore, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' }: Readonly<Props>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div>
      <div className={`grid ${cols} gap-4`}>
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {/* Sentinel for intersection observer */}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
        </div>
      )}
      {!hasMore && products.length > 0 && (
        <p className="text-center text-xs text-neutral-400 py-4">All {products.length} products loaded</p>
      )}
    </div>
  );
}
