'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useStorefrontStore } from '@/lib/storefront-store';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  description?: string;
  category?: { id: string; name: string; parentId?: string | null };
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
  _count?: { products: number };
}

// Recursively count total products in a node (own + all descendants)
function totalProducts(node: Category): number {
  const own = node._count?.products ?? 0;
  const childTotal = (node.children ?? []).reduce((sum, c) => sum + totalProducts(c), 0);
  return own + childTotal;
}

// Remove categories that have no products themselves and no children with products
function filterEmptyCategories(nodes: Category[]): Category[] {
  return nodes
    .map(node => ({ ...node, children: filterEmptyCategories(node.children ?? []) }))
    .filter(node => totalProducts(node) > 0);
}

const PAGE_SIZE = 16;

export function useShopData() {
  const { store } = useStorefrontStore();
  const storeId = store?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tree, setTree] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    api.get('/catalog/categories', { headers: { 'x-store-id': storeId } })
      .then((r) => {
        setCategories(r.data.categories);
        setTree(filterEmptyCategories(r.data.tree || []));
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    setPage(1);
    setProducts([]);
    setHasMore(true);
    api.get('/catalog/products', {
      headers: { 'x-store-id': storeId },
      params: { search: search || undefined, category: category || undefined, sort, page: 1, limit: PAGE_SIZE },
    }).then((r) => {
      setProducts(r.data.products);
      setTotal(r.data.total);
      setHasMore(r.data.products.length === PAGE_SIZE && r.data.total > PAGE_SIZE);
    }).catch(() => {});
  }, [storeId, search, category, sort]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !storeId) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    api.get('/catalog/products', {
      headers: { 'x-store-id': storeId },
      params: { search: search || undefined, category: category || undefined, sort, page: nextPage, limit: PAGE_SIZE },
    }).then((r) => {
      setProducts((prev) => [...prev, ...r.data.products]);
      setPage(nextPage);
      setHasMore(r.data.products.length === PAGE_SIZE && r.data.total > (nextPage * PAGE_SIZE));
    }).catch(() => {}).finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page, search, category, sort, storeId]);

  return { products, categories, tree, search, setSearch, category, setCategory, sort, setSort, loading, loadingMore, hasMore, total, loadMore };
}
