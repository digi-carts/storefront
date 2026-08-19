/**
 * Cart functionality tests.
 * Covers: empty cart, add item, qty update, remove item, totals, checkout navigation.
 */
import { test, expect } from '@playwright/test';

async function injectCartItem(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('sf-cart', JSON.stringify({
      state: {
        userId: null, storeId: null,
        items: [{ productId: 'test-001', name: 'Test Product', price: 99.99, qty: 2 }],
      },
      version: 0,
    }));
  });
}

test.describe('Cart — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cart');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('shows empty cart message', async ({ page }) => {
    await expect(page.locator('text=Your cart is empty')).toBeVisible({ timeout: 10000 });
  });

  test('empty cart has Browse Products link', async ({ page }) => {
    await expect(page.locator('a[href*="products"]:has-text("Browse")')).toBeVisible({ timeout: 10000 });
  });

  test('checkout button is not shown when cart is empty', async ({ page }) => {
    await expect(page.locator('a[href*="checkout"], button:has-text("Checkout")')).not.toBeVisible();
  });
});

test.describe('Cart — with items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cart');
    await injectCartItem(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Test Product', { timeout: 10000 });
  });

  test('shows cart items', async ({ page }) => {
    await expect(page.locator('text=Test Product')).toBeVisible();
  });

  test('shows correct total', async ({ page }) => {
    // 2 × 99.99 = 199.98
    await expect(page.locator('body')).toContainText('199.98');
  });

  test('increment quantity updates total', async ({ page }) => {
    const plusBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await plusBtn.click();
    // Wait for DOM to reflect 3 × 99.99 = 299.97
    await expect(page.locator('body')).toContainText('299.97', { timeout: 5000 });
  });

  test('decrement to zero removes item', async ({ page }) => {
    const minusBtn = page.locator('button').filter({ hasText: /^−$/ }).first();
    await minusBtn.click();
    // Wait for qty to update to 1 before clicking again
    await expect(page.locator('body')).toContainText('99.99', { timeout: 5000 });
    await minusBtn.click();
    await expect(page.locator('text=Your cart is empty')).toBeVisible({ timeout: 5000 });
  });

  test('remove button removes item', async ({ page }) => {
    const removeBtn = page.locator('button').filter({ hasText: /✕|×|✗/i }).first();
    await removeBtn.click();
    await expect(page.locator('text=Your cart is empty')).toBeVisible({ timeout: 5000 });
  });

  test('checkout button is visible with items', async ({ page }) => {
    await expect(page.locator('a[href*="checkout"]').first()).toBeVisible();
  });

  test('checkout link navigates to checkout page', async ({ page }) => {
    await page.locator('a[href*="checkout"]').first().click();
    await page.waitForURL('**/checkout', { timeout: 10000 });
    expect(page.url()).toContain('checkout');
  });
});

test.describe('Cart — add via products page', () => {
  test('add button on products page updates cart', async ({ page }) => {
    await page.goto('/cart');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.count() === 0) { test.skip(); return; }
    await addBtn.click();

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Your cart is empty')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Checkout page', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/cart');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    const isLoginPage = page.url().includes('login');
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    expect(isLoginPage || hasEmailInput).toBeTruthy();
  });
});
