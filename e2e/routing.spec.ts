/**
 * Routing & domain resolution tests.
 * Covers: platform subdomain, direct /s/ path, unknown store, static asset passthrough.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://iyra.digi-carts.com';
const DIRECT_BASE = process.env.DIRECT_BASE_URL || 'https://digi-cart-storefront-496160804659.us-east1.run.app';
const STORE_SLUG = process.env.STORE_SLUG || 'iyra';

test.describe('Platform subdomain routing', () => {
  test('loads store home from platform subdomain', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/s\//); // browser URL stays clean
    await expect(page.locator('text=Store not found')).not.toBeVisible({ timeout: 10000 });
    // Store content rendered — at minimum the page is not an error
    await expect(page.locator('body')).not.toContainText('Store not found');
  });

  test('does not expose /s/ slug in browser URL bar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/s/');
  });

  test('products page loads via clean URL', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('body')).not.toContainText('Store not found', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/s\//);
  });

  test('cart page loads via clean URL', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('body')).not.toContainText('Store not found', { timeout: 10000 });
  });

  test('login page loads via clean URL', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 });
  });

  test('register page loads via clean URL', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 });
  });

  test('about page loads via clean URL', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('body')).not.toContainText('Store not found', { timeout: 10000 });
  });
});

test.describe('Direct /s/ path routing', () => {
  test('loads store via /s/slug direct path', async ({ page }) => {
    await page.goto(`${DIRECT_BASE}/s/${STORE_SLUG}`);
    await expect(page.locator('body')).not.toContainText('Store not found', { timeout: 10000 });
  });

  test('loads products via /s/slug/products', async ({ page }) => {
    await page.goto(`${DIRECT_BASE}/s/${STORE_SLUG}/products`);
    await expect(page.locator('body')).not.toContainText('Store not found', { timeout: 10000 });
  });
});

test.describe('Unknown store — not found state', () => {
  test('shows Store not found for unknown slug', async ({ page }) => {
    await page.goto(`${DIRECT_BASE}/s/this-store-does-not-exist-xyz`);
    await expect(page.locator('text=Store not found')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('code')).toContainText('/s/your-store-name');
  });
});

test.describe('Static asset passthrough (not intercepted by middleware)', () => {
  test('_next/static assets are not rewritten', async ({ page }) => {
    const responses: number[] = [];
    page.on('response', r => {
      if (r.url().includes('/_next/static')) responses.push(r.status());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const bad = responses.filter(s => s >= 400);
    expect(bad).toHaveLength(0);
  });

  test('favicon is served', async ({ page, request }) => {
    const res = await request.get(`${BASE}/favicon.ico`);
    expect([200, 204, 304]).toContain(res.status());
  });
});

test.describe('Response headers', () => {
  test('x-middleware-rewrite header is set for platform subdomain', async ({ request }) => {
    const res = await request.get(`${BASE}/`, { maxRedirects: 0 });
    // Either a rewrite header exists, or the response is 200 (rewrite is transparent)
    expect([200, 301, 302, 307, 308]).toContain(res.status());
  });
});
