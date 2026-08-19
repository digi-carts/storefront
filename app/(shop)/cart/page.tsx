'use client';

import Link from 'next/link';
import { useCurrency, useTemplate } from '@/lib/template-context';
import { useCartStore } from '@/lib/cart-store';
import { useStorePath } from '@/lib/use-store-path';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { Button } from '@/components/ui/button';

export default function CartPage() {
  const { items, updateQty, removeItem, total } = useCartStore();
  const { symbol } = useCurrency();
  const template = useTemplate();
  const base = useStorePath();
  const isCard = template === 'card';

  return (
    <TemplateWrapper>
      <div className={`mx-auto px-6 py-10 max-w-2xl`}>
        <h1 className={`text-2xl font-bold mb-6 ${isCard ? 'text-indigo-900' : ''}`}>Your Cart</h1>

        {items.length === 0 ? (
          <div className={`text-center py-16 ${isCard ? 'bg-white rounded-2xl shadow' : ''}`}>
            <p className="text-neutral-400 mb-4 text-lg">Your cart is empty.</p>
            <Link href={`${base}/products`}><Button className={isCard ? 'bg-indigo-600 hover:bg-indigo-700 rounded-full' : 'rounded-full'}>Browse Products</Button></Link>
          </div>
        ) : (
          <>
            <div className={`space-y-3 mb-6 ${isCard ? 'bg-white rounded-2xl shadow p-4' : ''}`}>
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-3 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-neutral-400">{symbol}{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-full overflow-hidden text-sm">
                      <button className="px-2.5 py-0.5 hover:bg-neutral-100" onClick={() => updateQty(item.productId, item.qty - 1)}>−</button>
                      <span className="px-2">{item.qty}</span>
                      <button className="px-2.5 py-0.5 hover:bg-neutral-100" onClick={() => updateQty(item.productId, item.qty + 1)}>+</button>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{symbol}{(item.price * item.qty).toFixed(2)}</span>
                    <button className="text-neutral-300 hover:text-red-500 ml-1" onClick={() => removeItem(item.productId)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className={`flex justify-between items-center pt-4 ${isCard ? 'bg-white rounded-2xl shadow p-4' : 'border-t'}`}>
              <p className="font-bold text-xl">Total: {symbol}{total().toFixed(2)}</p>
              <Link href={`${base}/checkout`}>
                <Button className={isCard ? 'bg-indigo-600 hover:bg-indigo-700 rounded-full px-8' : 'rounded-full px-8'}>Checkout</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </TemplateWrapper>
  );
}
