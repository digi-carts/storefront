'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useTemplate } from '@/lib/template-context';
import { useStorePath } from '@/lib/use-store-path';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const base = useStorePath();
  const template = useTemplate();
  const isCard = template === 'card';

  const orderId = searchParams.get('orderId');

  return (
    <TemplateWrapper>
      <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center text-center space-y-6">
        <CheckCircle
          size={64}
          className={isCard ? 'text-indigo-500' : 'text-green-500'}
          strokeWidth={1.5}
        />

        <div className="space-y-2">
          <h1 className={`text-2xl font-bold ${isCard ? 'text-indigo-900' : ''}`}>
            Order Placed!
          </h1>
          <p className="text-neutral-500 text-sm">
            Thank you for your order. We&apos;ll start preparing it right away.
          </p>
          {orderId && (
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Order #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        <Button
          onClick={() => router.push(`${base}/orders`)}
          className={isCard ? 'rounded-full bg-indigo-600 hover:bg-indigo-700 px-8' : 'rounded-full px-8'}
        >
          View My Orders
        </Button>
      </div>
    </TemplateWrapper>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <OrderConfirmationContent />
    </Suspense>
  );
}
