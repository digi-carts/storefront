'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/cart-store';
import { useStorefrontStore } from '@/lib/storefront-store';
import { useTemplate, useCurrency } from '@/lib/template-context';
import { useStorePath } from '@/lib/use-store-path';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, CheckCircle, Loader2, MapPin } from 'lucide-react';

interface Address { id: string; name: string; line1: string; city: string; country: string; zip: string; isDefault: boolean }

interface PublicCoupon { code: string; type: string; value: number; minOrderAmt: number; expiresAt: string | null; description: string | null }

function getStoreIdFromLocalStorage(): string | null {
  try {
    const raw = localStorage.getItem('sf-auth');
    return raw ? JSON.parse(raw)?.state?.store?.id ?? null : null;
  } catch { return null; }
}

type AddrForm = { name: string; line1: string; city: string; country: string; zip: string; area: string; state: string };

const ADDR_FIELDS: [keyof AddrForm, string, string][] = [
  ['name', 'Full Name', 'John Doe'],
  ['line1', 'Address', '123 Main St'],
];

// Load Razorpay checkout script on demand
function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function CheckoutPageContent() {
  const { items, total, clear } = useCartStore();
  const { store, user } = useStorefrontStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const base = useStorePath();
  const template = useTemplate();
  const { currency, symbol } = useCurrency();
  const isCard = template === 'card';

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saveAddr, setSaveAddr] = useState(true);
  const [form, setForm] = useState<AddrForm>({ name: '', line1: '', city: '', country: 'IN', zip: '', area: '', state: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinStatus, setPinStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [pinAreas, setPinAreas] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount: number; offerId: string; description: string | null; reason?: string } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [payMethod, setPayMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [redirecting, setRedirecting] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | undefined>();
  const redirectingRef = useRef(false);

  const goToConfirmation = (orderId?: string) => {
    redirectingRef.current = true;
    setPlacedOrderId(orderId);
    setRedirecting(true);
    clear();
    // Use the browser URL, not Next's rewritten pathname. Soft navigation
    // (router.replace) often never completes on custom-domain rewrites, which
    // left checkout stuck on "Confirming your order…".
    const pathMatch = /^\/s\/([^/]+)/.exec(window.location.pathname);
    const publicBase = pathMatch ? `/s/${pathMatch[1]}` : '';
    const qs = orderId ? `?orderId=${encodeURIComponent(orderId)}` : '';
    window.location.replace(`${publicBase}/order-confirmation${qs}`);
  };

  useEffect(() => {
    api.get('/offers/public').then(r => setCoupons((r.data.offers ?? []) as PublicCoupon[])).catch(() => {});
  }, []);

  const checkCoupon = async (codeArg?: string) => {
    const code = (codeArg ?? couponCode).trim();
    if (!code) return;
    if (codeArg) setCouponCode(codeArg);
    setCouponChecking(true);
    setCouponResult(null);
    try {
      const { data } = await api.post('/offers/validate', {
        code,
        scope: 'PRODUCT',
        orderAmount: total(),
      });
      setCouponResult(data);
    } catch {
      setCouponResult({ valid: false, discount: 0, offerId: '', description: null, reason: 'Failed to validate' });
    } finally {
      setCouponChecking(false);
    }
  };

  // Shipping rate state
  const [shippingRates, setShippingRates] = useState<{ courierId: number; courierName: string; rate: number; etd: string; etdHours: number }[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<{ courierId: number; courierName: string; rate: number } | null>(null);
  const [shippingFallbackCharge, setShippingFallbackCharge] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  const fetchShippingRates = async (zip: string) => {
    const storeId = store?.id || getStoreIdFromLocalStorage();
    if (!storeId || zip.length < 5) return;
    setShippingLoading(true);
    setShippingRates([]); setSelectedCourier(null); setShippingFallbackCharge(null);
    try {
      const { data } = await api.post('/shipping/rates', { storeId, deliveryPincode: zip, cartTotal: total(), cod: false });
      setShippingRates(data.rates ?? []);
      if ((data.rates ?? []).length > 0) setSelectedCourier(data.rates[0]);
      if (typeof data.fallbackCharge === 'number') setShippingFallbackCharge(data.fallbackCharge);
    } catch { /* silently fall back to branding.deliveryCharge */ }
    finally { setShippingLoading(false); }
  };

  const lookupPincode = async (pin: string) => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) { setPinStatus('idle'); return; }
    setPinLoading(true); setPinStatus('idle'); setPinAreas([]);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await res.json();
      const record = json?.[0];
      if (record?.Status === 'Success' && record.PostOffice?.length > 0) {
        const po = record.PostOffice[0];
        const areas = record.PostOffice.map((p: { Name: string }) => p.Name);
        setForm(f => ({ ...f, city: po.District || po.Block || '', state: po.State || '', country: 'IN', area: areas[0] || '' }));
        setPinAreas(areas);
        setPinStatus('ok');
        fetchShippingRates(pin);
      } else {
        setPinStatus('err');
      }
    } catch {
      setPinStatus('err');
    } finally {
      setPinLoading(false);
    }
  };

  const loadAddresses = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/addresses');
      setSavedAddresses(data.addresses || []);
      const def = data.addresses?.find((a: Address) => a.isDefault);
      if (def) {
        setSelectedId(def.id);
        fetchShippingRates(def.zip);
      } else if (data.addresses?.length > 0) {
        setSelectedId(data.addresses[0].id);
        fetchShippingRates(data.addresses[0].zip);
      } else setShowNew(true);
    } catch { setShowNew(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      const next = encodeURIComponent(`${base}/checkout` + (searchParams.toString() ? '?' + searchParams.toString() : ''));
      router.push(`${base}/login?next=${next}`);
      return;
    }
    loadAddresses();
  }, [user, router, loadAddresses, searchParams]);

  const selectedAddress = savedAddresses.find(a => a.id === selectedId);

  const openRazorpay = (rzData: { keyId: string; amount: number; currency: string; orderId: string }, internalOrderId: string) =>
    new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: rzData.keyId,
        amount: rzData.amount,
        currency: rzData.currency,
        order_id: rzData.orderId,
        name: store?.name || 'Store',
        description: 'Order Payment',
        prefill: { email: user?.email },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api.post('/payment/orders/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            if (couponResult?.valid && couponResult.offerId) {
              await api.post('/offers/apply', { offerId: couponResult.offerId }).catch(() => {});
            }
            goToConfirmation(internalOrderId);
            resolve();
          } catch { reject(new Error('Payment verification failed')); }
        },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      });
      rzp.open();
    });

  const resolveShippingAddress = async () => {
    if (selectedAddress) {
      return { name: selectedAddress.name, line1: selectedAddress.line1, city: selectedAddress.city, country: selectedAddress.country, zip: selectedAddress.zip };
    }
    const fullAddr = { ...form, city: form.city || form.area, line1: [form.line1, form.area].filter(Boolean).join(', ') };
    if (showNew && saveAddr) {
      const { data } = await api.post('/auth/addresses', { ...fullAddr, isDefault: savedAddresses.length === 0 });
      return { name: data.address.name, line1: data.address.line1, city: data.address.city, country: data.address.country, zip: data.address.zip };
    }
    return fullAddr;
  };

  const placeOrder = async (paymentMethod: 'ONLINE' | 'COD' = 'ONLINE') => {
    const shippingAddress = await resolveShippingAddress();
    const cartPayload = items.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty }));
    const { data: orderData } = await api.post('/orders/orders/checkout', {
      shippingAddress, items: cartPayload, paymentMethod,
      courierId: selectedCourier?.courierId, courierName: selectedCourier?.courierName,
    });
    return orderData.order?.id as string;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!store?.id) { setError('Store not found — please go back.'); return; }
    setLoading(true); setError('');
    try {
      // Cash on Delivery — no gateway needed. Place the order and finish.
      if (payMethod === 'COD') {
        const codOrderId = await placeOrder('COD');
        if (couponResult?.valid && couponResult.offerId) {
          await api.post('/offers/apply', { offerId: couponResult.offerId }).catch(() => {});
        }
        goToConfirmation(codOrderId);
        return;
      }
      let paymentEnabled = false;
      let internalOrderId = '';
      try {
        internalOrderId = await placeOrder('ONLINE');
        const { data: rzData } = await api.post('/payment/orders/create', {
          amount: Math.round(grandTotal * 100), currency, referenceId: internalOrderId,
        });
        paymentEnabled = true;
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) throw new Error('Razorpay script failed to load');
        await openRazorpay(rzData, internalOrderId);
        return;
      } catch (rzErr: unknown) {
        if (paymentEnabled) {
          const msg = rzErr instanceof Error ? rzErr.message : 'Payment failed';
          if (msg === 'Payment cancelled') { setError('Payment cancelled. Your order was not completed.'); return; }
          throw rzErr;
        }
        if (couponResult?.valid && couponResult.offerId) {
          await api.post('/offers/apply', { offerId: couponResult.offerId }).catch(() => {});
        }
        if (internalOrderId) goToConfirmation(internalOrderId);
        else router.replace(`${base}/orders`);
        return;
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to place order. Please try again.');
    } finally {
      if (!redirectingRef.current) setLoading(false);
    }
  };

  const boxCls = isCard ? 'bg-white rounded-2xl shadow p-5' : 'border rounded-xl p-5';
  const btnCls = isCard ? 'bg-indigo-600 hover:bg-indigo-700 rounded-full w-full' : 'rounded-full w-full';
  const branding = (store?.branding as unknown || {}) as Record<string, unknown>;
  const packingCharge = Number(branding.packingCharge) || 0;
  const gstPercent = Number(branding.gstPercent) || 0;
  const subtotal = total();
  const couponDiscount = couponResult?.valid ? couponResult.discount : 0;
  // Dynamic delivery charge: courier selection > fallback > branding flat charge
  const deliveryCharge = selectedCourier?.rate ?? shippingFallbackCharge ?? (Number(branding.deliveryCharge) || 0);
  const gstAmount = gstPercent > 0 ? Math.round((subtotal * gstPercent / 100) * 100) / 100 : 0;
  const grandTotal = Math.max(0, subtotal + packingCharge + deliveryCharge + gstAmount - couponDiscount);

  if (!user) return null;
  if (redirecting) {
    return (
      <TemplateWrapper>
        <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center text-center space-y-6">
          <CheckCircle
            size={64}
            className={isCard ? 'text-indigo-500' : 'text-green-500'}
            strokeWidth={1.5}
          />
          <div className="space-y-2">
            <h1 className={`text-2xl font-bold ${isCard ? 'text-indigo-900' : ''}`}>Order Placed!</h1>
            <p className="text-neutral-500 text-sm">
              Thank you for your order. We&apos;ll start preparing it right away.
            </p>
            {placedOrderId && (
              <p className="text-xs text-neutral-400 font-mono mt-1">
                Order #{placedOrderId.slice(0, 8).toUpperCase()}
              </p>
            )}
          </div>
          <Button
            onClick={() => {
              const pathMatch = /^\/s\/([^/]+)/.exec(window.location.pathname);
              const publicBase = pathMatch ? `/s/${pathMatch[1]}` : '';
              window.location.assign(`${publicBase}/orders`);
            }}
            className={isCard ? 'rounded-full bg-indigo-600 hover:bg-indigo-700 px-8' : 'rounded-full px-8'}
          >
            View My Orders
          </Button>
        </div>
      </TemplateWrapper>
    );
  }
  if (items.length === 0) return <TemplateWrapper><div className="max-w-2xl mx-auto px-4 py-16 text-center text-neutral-400">Your cart is empty.</div></TemplateWrapper>;

  return (
    <TemplateWrapper>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <h1 className={`text-2xl font-bold ${isCard ? 'text-indigo-900' : ''}`}>Checkout</h1>

        {/* Order summary */}
        <div className={boxCls}>
          <h2 className="font-semibold mb-3">Order Summary</h2>
          {items.map((i) => (
            <div key={i.productId} className="flex justify-between text-sm py-1 text-neutral-600">
              <span>{i.name} × {i.qty}</span>
              <span>{symbol}{(i.price * i.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-1 text-neutral-500 border-t mt-2 pt-2">
            <span>Subtotal</span><span>{symbol}{subtotal.toFixed(2)}</span>
          </div>
          {packingCharge > 0 && (
            <div className="flex justify-between text-sm py-1 text-neutral-500">
              <span>Packing</span><span>{symbol}{packingCharge.toFixed(2)}</span>
            </div>
          )}
          {deliveryCharge > 0 && (
            <div className="flex justify-between text-sm py-1 text-neutral-500">
              <span>Delivery{selectedCourier ? ` (${selectedCourier.courierName})` : ''}</span>
              <span>{symbol}{deliveryCharge.toFixed(2)}</span>
            </div>
          )}
          {gstAmount > 0 && (
            <div className="flex justify-between text-sm py-1 text-neutral-500">
              <span>GST ({gstPercent}%)</span><span>{symbol}{gstAmount.toFixed(2)}</span>
            </div>
          )}
          {/* Available coupons — valid ones are colored/clickable, unmet ones grayed out */}
          {coupons.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-neutral-500">Available offers</p>
              <div className="flex flex-wrap gap-2">
                {coupons.map(c => {
                  const meetsMin = subtotal >= (c.minOrderAmt || 0);
                  const applied = couponResult?.valid && couponCode.toUpperCase() === c.code.toUpperCase();
                  const label = c.type === 'PERCENT' ? `${c.value}% off` : `${symbol}${c.value} off`;
                  return (
                    <button key={c.code} type="button"
                      disabled={!meetsMin}
                      onClick={() => checkCoupon(c.code)}
                      title={meetsMin ? (c.description ?? '') : `Add ${symbol}${((c.minOrderAmt || 0) - subtotal).toFixed(2)} more to use this`}
                      className={`text-left border rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                        !meetsMin
                          ? 'opacity-45 cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-400'
                          : applied
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:border-indigo-500 cursor-pointer'
                      }`}>
                      <span className="font-mono font-semibold">{c.code}</span>
                      <span className="ml-1">· {label}</span>
                      {c.minOrderAmt > 0 && <span className="block text-[10px] opacity-80">Min {symbol}{c.minOrderAmt}{!meetsMin ? ' (not met)' : ''}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Coupon input */}
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Coupon code"
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value); setCouponResult(null); }}
                onKeyDown={e => e.key === 'Enter' && checkCoupon()}
                className="h-8 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => checkCoupon()}
                disabled={couponChecking || !couponCode.trim()}>
                {couponChecking ? '…' : 'Apply'}
              </Button>
            </div>
            {couponResult && (
              <p className={`text-xs ${couponResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                {couponResult.valid
                  ? `${couponResult.description ?? 'Coupon applied'} — saving ${symbol}${couponDiscount.toFixed(2)}`
                  : (couponResult.reason ?? 'Invalid coupon')}
              </p>
            )}
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm py-1 text-green-600 mt-1">
              <span className="flex items-center gap-1"><Tag size={12} /> Coupon ({couponCode.toUpperCase()})</span>
              <span>− {symbol}{couponDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold mt-2 pt-2 border-t text-lg">
            <span>Total</span><span>{symbol}{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className={boxCls}>
          <h2 className="font-semibold mb-3">Payment Method</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { v: 'ONLINE' as const, label: 'Pay Online', hint: 'Card / UPI / netbanking' },
              { v: 'COD' as const, label: 'Cash on Delivery', hint: 'Pay when it arrives' },
            ]).map(opt => (
              <button key={opt.v} type="button" onClick={() => setPayMethod(opt.v)}
                className={`text-left border-2 rounded-xl p-3 transition-colors ${payMethod === opt.v ? (isCard ? 'border-indigo-500 bg-indigo-50' : 'border-black bg-neutral-50') : 'border-neutral-200 hover:border-neutral-400'}`}>
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-xs text-neutral-500">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Saved addresses */}
        {savedAddresses.length > 0 && (
          <div className={boxCls}>
            <h2 className="font-semibold mb-3">Delivery Address</h2>
            <div className="space-y-2">
              {savedAddresses.map((a) => {
                const activeCls = isCard ? 'border-indigo-500 bg-indigo-50' : 'border-black bg-neutral-50';
                const addrCls = `flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${selectedId === a.id ? activeCls : 'border-neutral-200 hover:border-neutral-400'}`;
                return (
                  <label key={a.id} className={addrCls} aria-label={`Select address: ${a.name}, ${a.line1}, ${a.city}`}>
                    <input type="radio" name="address" checked={selectedId === a.id}
                      onChange={() => { setSelectedId(a.id); setShowNew(false); fetchShippingRates(a.zip); }}
                      className="mt-1 accent-black" />
                    <div className="text-sm">
                      <p className="font-medium">{a.name} {a.isDefault && <span className="text-xs text-neutral-400 ml-1">(Default)</span>}</p>
                      <p className="text-neutral-500">{a.line1}, {a.city}, {a.country} — {a.zip}</p>
                    </div>
                  </label>
                );
              })}
              {(() => {
                const newActiveCls = isCard ? 'border-indigo-500 bg-indigo-50' : 'border-black bg-neutral-50';
                const newCls = `flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${showNew ? newActiveCls : 'border-neutral-200 hover:border-neutral-400'}`;
                return (
                  <label className={newCls} aria-label="Add new address">
                    <input type="radio" name="address" checked={showNew}
                      onChange={() => { setShowNew(true); setSelectedId(null); }} className="accent-black" />
                    <span className="text-sm font-medium">+ Add new address</span>
                  </label>
                );
              })()}
            </div>
          </div>
        )}

        {/* Courier selector for saved address */}
        {!showNew && selectedAddress && shippingRates.length > 0 && (
          <div className={boxCls}>
            <h2 className="font-semibold mb-3">Delivery Option</h2>
            {shippingLoading && <p className="text-xs text-neutral-400">Fetching delivery options…</p>}
            <div className="space-y-1">
              {shippingRates.map(r => {
                const selectedCls = isCard ? 'border-indigo-500 bg-indigo-50' : 'border-black bg-neutral-50';
                const courierCls = `flex items-center justify-between gap-3 p-3 border rounded-lg cursor-pointer text-sm ${selectedCourier?.courierId === r.courierId ? selectedCls : 'border-neutral-200 hover:border-neutral-400'}`;
                return (
                  <label key={r.courierId} className={courierCls}>
                    <input type="radio" name="courier" className="accent-black"
                      checked={selectedCourier?.courierId === r.courierId}
                      onChange={() => setSelectedCourier(r)} />
                    <span className="flex-1">{r.courierName}</span>
                    <span className="text-neutral-400 text-xs">{r.etd}</span>
                    <span className="font-medium">₹{r.rate}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* New address form */}
        {(showNew || savedAddresses.length === 0) && (
          <form onSubmit={handleSubmit} className={`${boxCls} space-y-4`}>
            <h2 className="font-semibold">New Address</h2>
            {ADDR_FIELDS.map(([k, lbl, ph]) => (
              <div key={k} className="space-y-1">
                <Label>{lbl}</Label>
                <Input placeholder={ph} value={form[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.value })} required />
              </div>
            ))}

            {/* PIN Code — triggers auto-lookup */}
            <div className="space-y-1">
              <Label>PIN Code</Label>
              <div className="relative">
                <Input
                  placeholder="e.g. 682001"
                  value={form.zip}
                  maxLength={6}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(f => ({ ...f, zip: val }));
                    lookupPincode(val);
                  }}
                  required
                  className={`pr-8 ${pinStatus === 'err' ? 'border-red-400 focus-visible:ring-red-400' : pinStatus === 'ok' ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {pinLoading && <Loader2 size={14} className="animate-spin text-neutral-400" />}
                  {!pinLoading && pinStatus === 'ok' && <CheckCircle size={14} className="text-green-500" />}
                  {!pinLoading && pinStatus === 'err' && <span className="text-red-500 text-xs font-bold">!</span>}
                </div>
              </div>
              {pinStatus === 'err' && <p className="text-xs text-red-500">Invalid PIN code — please check and retry.</p>}
            </div>

            {/* Auto-filled location details */}
            {pinStatus === 'ok' && (
              <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                  <MapPin size={12} /> Location detected
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {pinAreas.length > 1 ? (
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Area / Post Office</Label>
                      <select
                        value={form.area}
                        onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                        className="w-full h-8 border rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black">
                        {pinAreas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-xs text-neutral-400">Area</p>
                      <p className="text-sm font-medium">{form.area || '—'}</p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs text-neutral-400">City / District</p>
                    <p className="text-sm font-medium">{form.city || '—'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-neutral-400">State</p>
                    <p className="text-sm font-medium">{form.state || '—'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-neutral-400">Country</p>
                    <p className="text-sm font-medium">India</p>
                  </div>
                </div>
              </div>
            )}

            {shippingLoading && <p className="text-xs text-neutral-400">Fetching delivery options…</p>}
            {shippingRates.length > 0 && (
              <div className="space-y-1">
                <Label>Delivery Option</Label>
                <div className="space-y-1">
                  {shippingRates.map(r => (
                    <label key={r.courierId} className={`flex items-center justify-between gap-3 p-3 border rounded-lg cursor-pointer text-sm ${selectedCourier?.courierId === r.courierId ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}>
                      <input type="radio" name="courier" className="accent-black"
                        checked={selectedCourier?.courierId === r.courierId}
                        onChange={() => setSelectedCourier(r)} />
                      <span className="flex-1">{r.courierName}</span>
                      <span className="text-neutral-400 text-xs">{r.etd}</span>
                      <span className="font-medium">₹{r.rate}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer" htmlFor="save-addr">
              <input id="save-addr" type="checkbox" checked={saveAddr} onChange={e => setSaveAddr(e.target.checked)} className="accent-black" />
              <span>Save this address for future orders</span>
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading || pinStatus === 'err'} className={btnCls}>
              {loading ? 'Processing…' : (payMethod === 'COD' ? 'Place Order (Cash on Delivery)' : 'Pay & Place Order')}
            </Button>
          </form>
        )}

        {/* Checkout button for saved address */}
        {!showNew && selectedAddress && (
          <form onSubmit={handleSubmit}>
            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
            <Button type="submit" disabled={loading} className={btnCls}>
              {loading ? 'Processing…' : (payMethod === 'COD' ? `Place Order · Deliver to ${selectedAddress.city}` : `Pay & Deliver to ${selectedAddress.city}`)}
            </Button>
          </form>
        )}
      </div>
    </TemplateWrapper>
  );
}

export default function CheckoutPage() {
  return <Suspense><CheckoutPageContent /></Suspense>;
}
