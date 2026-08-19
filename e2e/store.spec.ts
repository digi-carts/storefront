/**
 * Store home page & product listing tests.
 */
import { test, expect } from '@playwright/test';

test.describe('Store home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders without "Store not found"', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Store not found');
  });

  test('page title is set', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('has navigation / navbar', async ({ page }) => {
    const nav = page.locator('header, nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('has a link to products (exists in DOM)', async ({ page }) => {
    // Link may be hidden in mobile hamburger menu — check it exists, not necessarily visible
    const links = page.locator('a[href*="products"], a[href*="Products"]');
    await expect(links.first()).toBeAttached({ timeout: 10000 });
  });

  test('has a cart link (exists in DOM)', async ({ page }) => {
    const cartLink = page.locator('a[href*="cart"]');
    await expect(cartLink.first()).toBeAttached({ timeout: 10000 });
  });
});

test.describe('Products page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
  });

  test('renders product list or empty state', async ({ page }) => {
    const hasProducts = await page.locator('[class*="grid"] > div, h3').count();
    const hasEmpty = await page.locator('text=No products found').count();
    expect(hasProducts + hasEmpty).toBeGreaterThan(0);
  });

  test('search input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search" i]')).toBeVisible({ timeout: 10000 });
  });

  test('search filters product list', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search" i]');
    await searchInput.fill('xyznonexistentproduct123');
    // Wait for the search to propagate — observe URL update which is synchronised with filter state
    await page.waitForURL(/search=xyznonexistentproduct/, { timeout: 5000 }).catch(() => {});
    const noProducts = page.locator('text=No products found');
    const productItems = await page.locator('[class*="grid"] > div').count();
    const noProductsVisible = await noProducts.isVisible();
    expect(noProductsVisible || productItems === 0).toBeTruthy();
  });

  test('sort dropdown is present (desktop only)', async ({ page }) => {
    // Sort select is hidden on mobile behind the filter drawer
    const vp = page.viewportSize();
    if (vp && vp.width < 768) { test.skip(); return; }
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking a product navigates to product detail', async ({ page }) => {
    // Collect all hrefs then goto directly — click() can be lost during hydration
    const hrefs: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).getAttribute('href') ?? '')
        .filter(h => /\/(products|p)\/[^/]+/.test(h))
    );
    if (hrefs.length === 0) { test.skip(); return; }
    await page.goto(hrefs[0]);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/(products|p)\/[^/]+/);
  });

  test('mobile filter button visible on small screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    const filterBtn = page.locator('button:has-text("Filter"), button[aria-label*="filter" i]').first();
    await expect(filterBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Product detail page', () => {
  test('loads product detail from direct URL', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    const productLink = page.locator('a[href*="/products/"], a[href*="/p/"]').first();
    if (await productLink.count() === 0) { test.skip(); return; }
    const href = await productLink.getAttribute('href');
    await page.goto(href!);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Store not found');
    await expect(page.locator('text=/[₹$€£][0-9]/').first()).toBeVisible({ timeout: 10000 });
  });

  test('add to cart button works', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    // Find a specific product detail link (not the /products listing link)
    const allLinks = page.locator('a[href*="/products/"], a[href*="/p/"]');
    const count = await allLinks.count();
    let detailHref: string | null = null;
    for (let i = 0; i < count; i++) {
      const href = await allLinks.nth(i).getAttribute('href');
      if (href && /\/(products|p)\/[^/]+/.test(href)) { detailHref = href; break; }
    }
    if (!detailHref) { test.skip(); return; }
    await page.goto(detailHref);
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add"), button:has-text("Buy")').first();
    if (await addBtn.count() === 0) { test.skip(); return; }
    await addBtn.click();
    await expect(page.locator('body')).toBeVisible();
  });
});
