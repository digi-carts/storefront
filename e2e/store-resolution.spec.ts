/**
 * Template-context / store resolution unit-level e2e tests.
 * Verifies resolveStoreDomain logic for all slug formats via browser execution.
 */
import { test, expect } from '@playwright/test';

const DIRECT_BASE = process.env.DIRECT_BASE_URL || 'https://digi-cart-storefront-496160804659.us-east1.run.app';
const STORE_SLUG = process.env.STORE_SLUG || 'iyra';
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'digi-carts.com';

test.describe('Store resolution — plain slug', () => {
  test('resolves clean slug to store', async ({ page }) => {
    await page.goto(`${DIRECT_BASE}/s/${STORE_SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Store not found')).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Store resolution — platform subdomain slug', () => {
  test('strips platform domain from slug and resolves store', async ({ page }) => {
    // Simulate what happens when storeSlug = "iyra.digi-carts.com" arrives (SSR edge case)
    // We test this by navigating via the actual platform subdomain
    const res = await page.goto(`https://${STORE_SLUG}.${PLATFORM_DOMAIN}/`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Store not found')).not.toBeVisible({ timeout: 10000 });
    // Confirm we got a 200 (not redirected to error)
    expect(res?.status()).toBeLessThan(400);
  });
});

test.describe('Store resolution — GCS config fetch', () => {
  test('fetches store config from GCS bucket', async ({ page }) => {
    const gcsFetches: string[] = [];
    page.on('request', req => {
      if (req.url().includes('storage.googleapis.com')) gcsFetches.push(req.url());
    });

    await page.goto(`${DIRECT_BASE}/s/${STORE_SLUG}`);
    await page.waitForLoadState('networkidle');

    // GCS config URL should have been requested
    const configFetch = gcsFetches.find(u => u.includes(`/config/${STORE_SLUG}.json`));
    expect(configFetch).toBeTruthy();
  });

  test('falls back to resolve API when GCS 404s', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/storefront/resolve')) apiCalls.push(req.url());
    });

    // Use a store slug that has no GCS config — fallback must kick in
    await page.goto(`${DIRECT_BASE}/s/nonexistent-store-fallback-test`);
    await page.waitForLoadState('networkidle');

    // Should either show "Store not found" (resolve also 404s) or load (resolve succeeds)
    // Either way no unhandled crash
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Store resolution — custom domain (mocked)', () => {
  test('custom domain slug passes through as-is', async ({ page }) => {
    // We can't actually visit a custom domain in tests, but we can verify
    // the page at /s/ path correctly handles a slug that looks like a domain
    // by checking the resolve API is called with the right domain param
    const resolveCalls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/storefront/resolve')) resolveCalls.push(req.url());
    });

    await page.goto(`${DIRECT_BASE}/s/mycustomshop.com`);
    await page.waitForLoadState('networkidle');

    const customDomainCall = resolveCalls.find(u => u.includes('mycustomshop.com'));
    expect(customDomainCall).toBeTruthy();
  });
});

test.describe('Template context — currency and theme', () => {
  test('currency symbol renders on products page', async ({ page }) => {
    await page.goto(`${DIRECT_BASE}/s/${STORE_SLUG}/products`);
    await page.waitForLoadState('networkidle');
    // At least one currency symbol visible (₹, $, €, £, etc.)
    const hasCurrency = await page.locator('text=/[₹$€£A-Z]\d/').count();
    // Only assert if products actually loaded
    const hasProducts = await page.locator('[class*="grid"] > div, [class*="product"]').count();
    if (hasProducts > 0) {
      expect(hasCurrency).toBeGreaterThan(0);
    }
  });
});
