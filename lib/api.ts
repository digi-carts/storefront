import axios from 'axios';
import { sfKey } from './storefront-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(sfKey('sf_accessToken'));
    if (token) config.headers.Authorization = `Bearer ${token}`;

    try {
      const raw = localStorage.getItem(sfKey('sf-auth'));
      if (raw) {
        const storeId = JSON.parse(raw)?.state?.store?.id;
        if (storeId) config.headers['x-store-id'] = storeId;
      }
    } catch { /* ignore */ }
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem(sfKey('sf_refreshToken'));
        if (!refreshToken) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem(sfKey('sf_accessToken'), data.accessToken);
        localStorage.setItem(sfKey('sf_refreshToken'), data.refreshToken);
        // Update zustand store
        try {
          const raw = localStorage.getItem(sfKey('sf-auth'));
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.state.accessToken = data.accessToken;
            localStorage.setItem(sfKey('sf-auth'), JSON.stringify(parsed));
          }
        } catch { /* ignore */ }
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — clear auth and redirect to login
        localStorage.removeItem(sfKey('sf_accessToken'));
        localStorage.removeItem(sfKey('sf_refreshToken'));
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          const pathMatch = /^\/s\/([^/]+)/.exec(window.location.pathname);
          const base = pathMatch ? `/s/${pathMatch[1]}` : '';
          window.location.href = `${base}/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
      }
    }
    throw error;
  }
);
