/**
 * Auth flow tests: login, register, validation, redirect after login.
 * Does NOT test real credentials — only UI behaviour and validation.
 */
import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Wait past TemplateProvider loading skeleton
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  });

  test('renders sign in form', async ({ page }) => {
    await expect(page.locator('text=Sign in').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('has link to register page', async ({ page }) => {
    const link = page.locator('a[href*="register"]');
    await expect(link).toBeVisible({ timeout: 5000 });
  });

  test('shows error on bad credentials', async ({ page }) => {
    // Use 400 not 401 — axios interceptor treats 401 as expired token and redirects to login
    await page.route('**/auth/login', route =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid credentials' }) })
    );
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 8000 });
  });

  test('submit button is disabled while loading', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    // Intercept the API call so we can observe loading state
    await page.route('**/auth/login', async route => {
      await new Promise(r => setTimeout(r, 1000));
      await route.abort();
    });
    const btn = page.locator('button[type="submit"]');
    await btn.click();
    await expect(btn).toBeDisabled({ timeout: 2000 });
  });

  test('next param is preserved in register link', async ({ page }) => {
    await page.goto('/login?next=/cart');
    await page.waitForLoadState('networkidle');
    const registerLink = page.locator('a[href*="register"]');
    const href = await registerLink.getAttribute('href');
    expect(href).toContain('next=');
  });
});

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  });

  test('renders create account form', async ({ page }) => {
    await expect(page.locator('text=Create account').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('has link to sign in page', async ({ page }) => {
    const link = page.locator('a[href*="login"]');
    await expect(link).toBeVisible({ timeout: 5000 });
  });

  test('shows error on duplicate email', async ({ page }) => {
    await page.fill('input[type="email"]', 'existing@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.route('**/auth/register', route =>
      route.fulfill({ status: 409, body: JSON.stringify({ error: 'Email already in use' }) })
    );
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/Registration failed|already in use/i')).toBeVisible({ timeout: 8000 });
  });

  test('password field enforces minlength=8', async ({ page }) => {
    const pwInput = page.locator('input[type="password"]');
    const minLength = await pwInput.getAttribute('minlength');
    expect(Number(minLength)).toBeGreaterThanOrEqual(8);
  });
});

test.describe('Auth redirect after login', () => {
  test('redirects to next param after successful login', async ({ page }) => {
    await page.goto('/login?next=/cart');
    await page.waitForLoadState('networkidle');

    // Mock successful login
    await page.route('**/auth/login', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'u1', email: 'test@example.com', role: 'user' },
          accessToken: 'fake.token.here',
          refreshToken: 'fake.refresh.here',
        }),
      })
    );

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/cart', { timeout: 8000 });
    expect(page.url()).toContain('cart');
  });
});

test.describe('Auth — protected route guard', () => {
  test('orders page requires login', async ({ page }) => {
    await page.goto('/cart');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    const isLoginPage = page.url().includes('login');
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    expect(isLoginPage || hasEmailInput).toBeTruthy();
  });

  test('profile page requires login', async ({ page }) => {
    await page.goto('/cart');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const isLoginPage = page.url().includes('login');
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    expect(isLoginPage || hasEmailInput).toBeTruthy();
  });
});
