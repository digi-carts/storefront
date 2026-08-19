/**
 * Platform hosts look like:
 *   iyre-collections.digi-carts.com
 *   iyra.digi-carts.com
 *   iyra.digi-carts.com
 *
 * Cloud Run is configured with PLATFORM_DOMAIN=digi-carts.com, so a store
 * on *.digi-carts.com was previously treated as a fully custom domain (slug =
 * the entire hostname). That breaks GCS config lookup and catalog fetches.
 */

function envPlatformDomains(): string[] {
  return [process.env.PLATFORM_DOMAIN, process.env.NEXT_PUBLIC_PLATFORM_DOMAIN]
    .filter((d): d is string => Boolean(d))
    .map(d => d.replace(/^\./, '').toLowerCase());
}

const BUILTIN_PLATFORM_DOMAINS = ['digi-carts.com', 'digi-carts.com', 'digi-carts.com'];

function platformSuffixes(): string[] {
  const all = [...envPlatformDomains(), ...BUILTIN_PLATFORM_DOMAINS];
  const unique = [...new Set(all)];
  unique.sort((a, b) => b.length - a.length);
  return unique;
}

export function hostFromInput(input: string): string {
  return input.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
}

/** Short store id: "iyre-collections" from "iyre-collections.digi-carts.com". */
export function canonicalStoreSlug(input: string): string {
  const host = hostFromInput(input);
  if (!host) return host;
  for (const suffix of platformSuffixes()) {
    if (host === suffix) continue;
    if (host.endsWith(`.${suffix}`)) {
      const rest = host.slice(0, -(suffix.length + 1));
      return rest.split('.')[0];
    }
  }
  return host;
}

/** Domain sent to /storefront/resolve — short slug becomes slug.digi-carts.com. */
export function storeResolveDomain(slugOrHost: string): string {
  const slug = canonicalStoreSlug(slugOrHost);
  if (slug.includes('.')) return slug;
  return `${slug}.digi-carts.com`;
}

export function storeConfigKey(slugOrHost: string): string {
  return canonicalStoreSlug(slugOrHost);
}

export function sameStore(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return canonicalStoreSlug(a) === canonicalStoreSlug(b);
}
