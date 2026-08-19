'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useStorefrontStore } from '@/lib/storefront-store';
import { sameStore, storeConfigKey, storeResolveDomain } from '@/lib/store-domain';

interface StoreContext {
  template: string;
  currency: string;
  currencySymbol: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$',
  CAD: 'C$', SGD: 'S$', AED: 'د.إ', JPY: '¥', MYR: 'RM',
};

const GCS_BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET || 'digi-cart-uploads-'''' ''${'' ''secrets.GCP_PROJECT_ID'' ''}';

const defaultCtx: StoreContext = { template: 'default', currency: 'INR', currencySymbol: '₹' };
const TemplateContext = createContext<StoreContext>(defaultCtx);

export function useTemplate() { return useContext(TemplateContext).template; }
export function useCurrency() {
  const { currency, currencySymbol } = useContext(TemplateContext);
  return { currency, symbol: currencySymbol };
}

function resolveStoreDomain(storeSlug?: string): string | null {
  if (storeSlug) return storeResolveDomain(storeSlug);
  const host = window.location.hostname;
  const pathMatch = /^\/s\/([^/]+)/.exec(window.location.pathname);
  if (pathMatch) return storeResolveDomain(pathMatch[1]);
  const storeParam = new URLSearchParams(window.location.search).get('store');
  if (storeParam) return storeResolveDomain(storeParam);
  if (host === 'localhost' || host === '127.0.0.1') {
    const envSlug = process.env.NEXT_PUBLIC_STORE_SUBDOMAIN;
    if (!envSlug) return null;
    return storeResolveDomain(envSlug);
  }
  return storeResolveDomain(host);
}

/** Shop Settings `store.currency` is the source of truth — not branding leftovers. */
function resolveCurrencyCode(s: { currency?: unknown }): string {
  const raw = typeof s.currency === 'string' ? s.currency.trim() : '';
  if (!raw) return 'INR';
  const up = raw.toUpperCase();
  if (CURRENCY_SYMBOLS[up]) return up;
  const fromSymbol = Object.entries(CURRENCY_SYMBOLS).find(([, sym]) => raw === sym)?.[0];
  return fromSymbol || up;
}

function ctxFromStore(s: { template?: string; branding?: Record<string, string>; currency?: unknown }): StoreContext {
  const currency = resolveCurrencyCode(s);
  return { template: s.template || 'default', currency, currencySymbol: CURRENCY_SYMBOLS[currency] || currency };
}

type FetchResult = Record<string, unknown> | 'down' | null;

function subdomainFromDomain(domain: string): string {
  return storeConfigKey(domain);
}

function mergeStoreData(gcsData: FetchResult, apiData: FetchResult): FetchResult {
  if (apiData === 'down') return 'down';
  if (!apiData && gcsData === 'down') return 'down';
  if (!apiData && !gcsData) return null;
  if (!apiData) return gcsData === 'down' ? 'down' : gcsData;
  if (!gcsData || gcsData === 'down') return apiData;
  const api = apiData as Record<string, unknown>;
  const gcs = gcsData as Record<string, unknown>;
  const apiBranding = (api.branding && typeof api.branding === 'object') ? api.branding as Record<string, unknown> : {};
  const gcsBranding = (gcs.branding && typeof gcs.branding === 'object') ? gcs.branding as Record<string, unknown> : {};
  return {
    ...gcs,
    ...api,
    currency: api.currency || gcs.currency || 'INR', // shop setting from DB, then published config
    template: api.template || gcs.template,
    branding: { ...gcsBranding, ...apiBranding },
  };
}

// Fetch store config from GCS static JSON — fast, no DB hit
async function fetchFromGCS(subdomain: string): Promise<FetchResult> {
  try {
    const url = `https://storage.googleapis.com/${GCS_BUCKET}/config/${subdomain}.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    if (data.published === false) return 'down';
    return data;
  } catch {
    return null;
  }
}

// Fallback: fetch from resolve API
async function fetchFromAPI(domain: string): Promise<FetchResult> {
  try {
    const r = await api.get(`/storefront/resolve?domain=${encodeURIComponent(domain)}`);
    return r.data.store as Record<string, unknown>;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 503) return 'down';
    }
    return null;
  }
}

interface TemplateProviderProps { children: ReactNode; storeSlug?: string }

export function TemplateProvider({ children, storeSlug }: Readonly<TemplateProviderProps>) {
  const { store, setStore } = useStorefrontStore();
  const [ctx, setCtx] = useState<StoreContext>(defaultCtx);
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [storeDown, setStoreDown] = useState(false);

  useEffect(() => {
    const domain = resolveStoreDomain(storeSlug);
    if (!domain) { setNotFound(true); setReady(true); return; }

    const requestedSubdomain = subdomainFromDomain(domain);

    function applyResult(s: FetchResult) {
      if (s === 'down') { setStoreDown(true); return; }
      if (s) { setStore(s as never); setCtx(ctxFromStore(s)); }
      else { setNotFound(true); }
    }

    // Cache-first: render immediately from Zustand cache
    if (store && sameStore(store.subdomain, requestedSubdomain)) {
      setCtx(ctxFromStore(store));
      setReady(true);
      Promise.all([fetchFromGCS(requestedSubdomain), fetchFromAPI(domain)]).then(([gcsData, apiData]) => {
        const s = mergeStoreData(gcsData, apiData);
        if (s === 'down') { setStoreDown(true); setStore(null as never); return; }
        if (s) { setStore(s as never); setCtx(ctxFromStore(s)); }
      });
      return;
    }

    if (store?.subdomain && !sameStore(store.subdomain, requestedSubdomain)) {
      setStore(null as never);
    }

    Promise.all([fetchFromGCS(requestedSubdomain), fetchFromAPI(domain)]).then(([gcsData, apiData]) => {
      applyResult(mergeStoreData(gcsData, apiData));
    }).finally(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug]);

  if (!ready) return (
    <div className="min-h-screen bg-neutral-50 animate-pulse">
      <div className="h-14 bg-white border-b" />
    </div>
  );

  if (storeDown) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-neutral-800 mb-2">Store temporarily unavailable</h1>
          <p className="text-neutral-500 text-sm leading-relaxed">This store is down for a short time. Please check back later — it will be back up soon.</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center px-6">
          <p className="text-6xl mb-4">🏪</p>
          <h1 className="text-2xl font-bold mb-2">Store not found</h1>
          <p className="text-neutral-500">Use a URL like <code className="bg-neutral-100 px-2 py-1 rounded text-sm">/s/your-store-name</code></p>
        </div>
      </div>
    );
  }

  return (
    <TemplateContext.Provider value={ctx}>
      {children}
    </TemplateContext.Provider>
  );
}
