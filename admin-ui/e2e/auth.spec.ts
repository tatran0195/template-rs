import { test, expect } from '@playwright/test';

test.describe('auth e2e', () => {
  test('login with mock credentials and reach dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('h1')).toContainText('Admin Panel');

    await page.fill('input[type="email"]', 'admin@raisfast.dev');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('register and redirect to dashboard', async ({ page }) => {
    await page.goto('/auth/register');
    await page.locator('form input').nth(0).fill('e2etest');
    await page.locator('form input').nth(1).fill('e2e@test.dev');
    await page.locator('form input').nth(2).fill('e2epass');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
