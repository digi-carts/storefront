/**
 * Performance and PWA checks.
 */
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('home page loads within 15 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
  });

  test('products page loads within 15 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
  });

  test('no 4xx/5xx errors on home page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('response', res => {
      if (res.status() >= 400 && !res.url().includes('storage.googleapis.com')) {
        errors.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter out expected 404s (missing GCS config for other stores, platform-config)
    const hardErrors = errors.filter(e =>
      !e.includes('storage.googleapis.com') &&
      !e.includes('platform-config') &&
      !e.includes('favicon')
    );
    expect(hardErrors).toEqual([]);
  });
});

test.describe('PWA manifest', () => {
  test('manifest.json is served', async ({ request }) => {
    // Use the direct Cloud Run URL — manifest.json is a static public file,
    // not rewritten by middleware (we pass it through explicitly now)
    const DIRECT = process.env.DIRECT_BASE_URL || 'https://digi-cart-storefront-496160804659.us-east1.run.app';
    const res = await request.get(`${DIRECT}/manifest.json`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('name');
    expect(json).toHaveProperty('icons');
  });
});

test.describe('Mobile responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('home page renders on mobile without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('products page renders on mobile', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Store not found');
  });

  test('cart page renders on mobile', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
