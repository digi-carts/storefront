'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useStorefrontStore } from '@/lib/storefront-store';
import { useTemplate, useCurrency } from '@/lib/template-context';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { Badge } from '@/components/ui/badge';

interface OrderItem { id: string; productName: string; qty: number; priceAtOrder: number }
interface Order {
  id: string; status: string; total: number; createdAt: string; items: OrderItem[];
  trackingId?: string | null; courierProvider?: string | null; adminComment?: string | null; trackingStatus?: string | null;
}
interface ReturnRec { id: string; orderId: string; status: string; refundStatus: string; refundAmount: number }

const RETURN_REASONS = ['Defective / damaged', 'Wrong item received', 'No longer needed', 'Size / fit issue', 'Other'];
const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Return requested', APPROVED: 'Return approved', REJECTED: 'Return rejected',
  PICKED_UP: 'Picked up', REFUNDED: 'Refunded', COMPLETED: 'Return complete',
};

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'outline'> = {
  PENDING: 'secondary', PROCESSING: 'default', SHIPPED: 'default',
  DELIVERED: 'default', RECEIVED: 'default', CANCELLED: 'outline',
};
const STATUS_ICON: Record<string, string> = {
  PENDING: '🕐', PROCESSING: '⚙️', SHIPPED: '🚚', DELIVERED: '✅', RECEIVED: '🎉', CANCELLED: '❌',
};
const ACTIVE_STATUSES = new Set(['PENDING', 'PROCESSING', 'SHIPPED']);

export default function OrdersPage() {
  const { user, store } = useStorefrontStore();
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRec[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  // Return modal state
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [returnComment, setReturnComment] = useState('');
  const [returnErr, setReturnErr] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);
  const [liveTrack, setLiveTrack] = useState<Record<string, string>>({});
  const template = useTemplate();
  const { symbol } = useCurrency();
  const isCard = template === 'card';
  const b = (store?.branding || {}) as Record<string, string>;

  const baseMatch = /^(\/s\/[^/]+)/.exec(pathname);
  const base = baseMatch ? baseMatch[1] : '';

  const ordersTitle = b.ordersTitle || 'My Orders';
  const statusMessages: Record<string, string> = {
    PENDING:    b.orderPendingMessage   || 'We are preparing your order.',
    PROCESSING: b.orderPendingMessage   || 'Your order is being processed.',
    SHIPPED:    b.orderShippedMessage   || 'Your order is on its way!',
    DELIVERED:  b.orderDeliveredMessage || 'Your order has been delivered. Enjoy!',
    RECEIVED:   'You have confirmed receipt of this order.',
    CANCELLED:  'Your order was cancelled.',
  };

  const load = () => {
    api.get('/orders/orders').then((r) => setOrders(r.data.orders)).catch(() => {});
    api.get('/orders/returns').then((r) => setReturns(r.data.returns ?? [])).catch(() => {});
  };

  useEffect(() => {
    if (!user) {
      router.replace(`${base}/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    load();
  }, [user, router, base, pathname]);

  const customerAction = async (orderId: string, action: 'received' | 'reopen') => {
    setActionLoading(orderId + action);
    try {
      await api.patch(`/orders/orders/${orderId}/customer-action`, { action });
      load();
    } finally {
      setActionLoading(null);
    }
  };

  const returnByOrder = (orderId: string) => returns.find(r => r.orderId === orderId && r.status !== 'REJECTED');

  const trackLive = async (o: Order) => {
    if (!o.trackingId) return;
    setLiveTrack(m => ({ ...m, [o.id]: 'Checking…' }));
    try {
      const { data } = await api.get(`/shipping/track/${encodeURIComponent(o.trackingId)}`);
      setLiveTrack(m => ({ ...m, [o.id]: data.status || 'Unknown' }));
    } catch {
      setLiveTrack(m => ({ ...m, [o.id]: 'Tracking unavailable' }));
    }
  };

  const openReturn = (o: Order) => {
    setReturnOrder(o);
    setReturnQty(Object.fromEntries(o.items.map(i => [i.id, i.qty])));
    setReturnReason(RETURN_REASONS[0]);
    setReturnComment('');
    setReturnErr('');
  };

  const submitReturn = async () => {
    if (!returnOrder) return;
    const items = Object.entries(returnQty)
      .filter(([, q]) => q > 0)
      .map(([orderItemId, qty]) => ({ orderItemId, qty }));
    if (items.length === 0) { setReturnErr('Select at least one item to return.'); return; }
    setReturnSaving(true); setReturnErr('');
    try {
      await api.post(`/orders/orders/${returnOrder.id}/return`, { items, reason: returnReason, comment: returnComment || undefined });
      setReturnOrder(null);
      load();
    } catch (err: unknown) {
      setReturnErr((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not submit return.');
    } finally { setReturnSaving(false); }
  };

  const activeOrders   = orders.filter(o => ACTIVE_STATUSES.has(o.status));
  const historyOrders  = orders.filter(o => !ACTIVE_STATUSES.has(o.status));
  const displayed      = tab === 'active' ? activeOrders : historyOrders;

  const boxCls       = isCard ? 'bg-white rounded-2xl shadow p-5' : 'bg-white rounded-xl border p-4';
  const activeTabCls = isCard ? 'border-b-2 border-indigo-600 text-indigo-700 font-semibold' : 'border-b-2 border-black font-semibold';
  const inactiveTabCls = 'text-neutral-400 hover:text-neutral-700';
  const btnBase      = 'px-4 py-1.5 rounded-full text-xs font-medium transition-colors border';
  const primaryBtn   = isCard ? `${btnBase} bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700` : `${btnBase} bg-black text-white border-black hover:bg-neutral-800`;
  const outlineBtn   = `${btnBase} border-neutral-300 text-neutral-700 hover:border-black`;

  return (
    <TemplateWrapper>
      <div className="mx-auto px-6 py-10 max-w-2xl">
        <h1 className={`text-2xl font-bold mb-5 ${isCard ? 'text-indigo-900' : ''}`}>{ordersTitle}</h1>

        {/* Tabs */}
        <div className="flex gap-6 border-b mb-6">
          <button type="button"
            onClick={() => setTab('active')}
            className={`pb-2 text-sm transition-colors ${tab === 'active' ? activeTabCls : inactiveTabCls}`}>
            Active
            {activeOrders.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${isCard ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-600'}`}>
                {activeOrders.length}
              </span>
            )}
          </button>
          <button type="button"
            onClick={() => setTab('history')}
            className={`pb-2 text-sm transition-colors ${tab === 'history' ? activeTabCls : inactiveTabCls}`}>
            History
            {historyOrders.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {historyOrders.length}
              </span>
            )}
          </button>
        </div>

        {displayed.length === 0 && (
          <div className={`${boxCls} text-center py-12 text-neutral-400`}>
            {tab === 'active' ? 'No active orders.' : 'No order history yet.'}
          </div>
        )}

        <div className="space-y-4">
          {displayed.map((o) => (
            <div key={o.id} className={boxCls}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xs text-neutral-400">#{o.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span>{STATUS_ICON[o.status] ?? '📦'}</span>
                    <Badge variant={STATUS_COLOR[o.status] ?? 'secondary'}>{o.status}</Badge>
                  </div>
                  <p className="text-xs text-neutral-400 text-right max-w-[180px]">{statusMessages[o.status]}</p>
                </div>
              </div>

              {/* Progress bar — only for active (not DELIVERED which has its own action) */}
              {ACTIVE_STATUSES.has(o.status) && o.status !== 'DELIVERED' && (
                <>
                  <div className="flex items-center gap-1 mb-4">
                    {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map((s, i) => {
                      const statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
                      const currentIdx = statuses.indexOf(o.status);
                      const active = i <= currentIdx;
                      const activeCls = isCard ? 'bg-indigo-500' : 'bg-black';
                      const barCls = active ? activeCls : 'bg-neutral-200';
                      return (
                        <div key={s} className="flex items-center flex-1">
                          <div className={`h-2 flex-1 rounded-full transition-colors ${barCls}`} />
                          {i < 3 && <div className={`w-2 h-2 rounded-full mx-0.5 ${active ? activeCls : 'bg-neutral-200'}`} />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-3 -mt-2">
                    <span>Ordered</span><span>Processing</span><span>Shipped</span><span>Delivered</span>
                  </div>
                </>
              )}

              {/* Tracking info */}
              {(o.courierProvider || o.trackingId) && (
                <div className="rounded-lg bg-neutral-50 border px-3 py-2 mb-3">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Delivery Tracking</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {o.courierProvider && (
                      <div>
                        <p className="text-xs text-neutral-400">Courier</p>
                        <p className="font-medium">{o.courierProvider}</p>
                      </div>
                    )}
                    {o.trackingId && (
                      <div>
                        <p className="text-xs text-neutral-400">Tracking ID</p>
                        <p className="font-medium font-mono">{o.trackingId}</p>
                      </div>
                    )}
                  </div>
                  {o.trackingId && (
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => trackLive(o)}
                        className="text-xs underline text-blue-600">Track live</button>
                      {(liveTrack[o.id] || o.trackingStatus) && (
                        <span className="text-xs text-neutral-600">· {liveTrack[o.id] || o.trackingStatus}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Admin comment */}
              {o.adminComment && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 mb-3">
                  <p className="text-xs font-semibold text-blue-600 mb-1">Note from Store</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{o.adminComment}</p>
                </div>
              )}

              <div className="space-y-1 border-t pt-3">
                {o.items.map((item) => (
                  <div key={`${item.productName}-${item.priceAtOrder}`} className="flex justify-between text-sm text-neutral-600">
                    <span>{item.productName} × {item.qty}</span>
                    <span>{symbol}{(item.priceAtOrder * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-sm mt-3 pt-3 border-t">
                <span>Total</span>
                <span className={isCard ? 'text-indigo-700' : ''}>{symbol}{o.total.toFixed(2)}</span>
              </div>

              {/* Customer actions */}
              {(o.status === 'DELIVERED' || o.status === 'RECEIVED') && (
                <div className="mt-4 pt-3 border-t space-y-2">
                  {returnByOrder(o.id) ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span>↩️</span>
                      <Badge variant="secondary">{RETURN_STATUS_LABEL[returnByOrder(o.id)!.status] ?? returnByOrder(o.id)!.status}</Badge>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {o.status === 'DELIVERED' && (
                        <button type="button"
                          disabled={actionLoading === o.id + 'received'}
                          onClick={() => customerAction(o.id, 'received')}
                          className={primaryBtn}>
                          {actionLoading === o.id + 'received' ? 'Confirming…' : 'Yes, I received it'}
                        </button>
                      )}
                      <button type="button" onClick={() => openReturn(o)} className={outlineBtn}>
                        Request return
                      </button>
                    </div>
                  )}
                </div>
              )}

              {o.status === 'CANCELLED' && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-neutral-500 mb-2">Changed your mind?</p>
                  <button type="button"
                    disabled={actionLoading === o.id + 'reopen'}
                    onClick={() => customerAction(o.id, 'reopen')}
                    className={outlineBtn}>
                    {actionLoading === o.id + 'reopen' ? 'Reopening…' : 'Reopen Order'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Return request modal */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReturnOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Request a return</h2>
              <button type="button" onClick={() => setReturnOrder(null)} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-neutral-500">Choose the items and quantities to return. Returns are allowed within 7 days of delivery.</p>
              <div className="space-y-2">
                {returnOrder.items.map(it => (
                  <div key={it.id} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{it.productName}</p>
                      <p className="text-xs text-neutral-400">Ordered: {it.qty}</p>
                    </div>
                    <select value={returnQty[it.id] ?? 0}
                      onChange={e => setReturnQty(q => ({ ...q, [it.id]: Number(e.target.value) }))}
                      className="border rounded-md px-2 py-1 text-sm bg-white shrink-0">
                      {Array.from({ length: it.qty + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reason</label>
                <select value={returnReason} onChange={e => setReturnReason(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Comment <span className="text-neutral-400 font-normal">(optional)</span></label>
                <textarea value={returnComment} onChange={e => setReturnComment(e.target.value)} rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm resize-y" placeholder="Tell the store more…" />
              </div>
              {returnErr && <p className="text-sm text-red-500">{returnErr}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setReturnOrder(null)} className={outlineBtn}>Cancel</button>
                <button type="button" onClick={submitReturn} disabled={returnSaving} className={`${primaryBtn} flex-1`}>
                  {returnSaving ? 'Submitting…' : 'Submit return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TemplateWrapper>
  );
}
