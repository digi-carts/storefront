'use client';
import { use } from 'react';
import ProductDetailPage from '@/app/(shop)/products/[id]/page';
export default function Page({ params }: Readonly<{ params: Promise<{ store: string; id: string }> }>) {
  const { id } = use(params);
  return <ProductDetailPage params={Promise.resolve({ id })} />;
}
