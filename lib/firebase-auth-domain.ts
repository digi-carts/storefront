import { api } from '@/lib/api';

/** Ask the platform to whitelist this store host for Firebase Google/Facebook/phone sign-in. */
export async function ensureFirebaseAuthorizedDomain(): Promise<void> {
  if (typeof window === 'undefined') return;
  const domain = window.location.hostname;
  if (!domain || domain === 'localhost' || domain === '127.0.0.1') return;
  await api.post('/platform/platform-config/firebase-authorized-domains', { domain }).catch(() => {});
}

export function firebaseAuthErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string }).code || '';
  if (code === 'auth/unauthorized-domain') {
    return 'Google sign-in is being enabled for this store URL. Wait a few seconds and try again.';
  }
  return (err as Error).message || fallback;
}
