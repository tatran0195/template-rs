import { test, expect } from '@playwright/test';

test.describe('content types e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@raisfast.dev');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('create content type and CMS record', async ({ page }) => {
    // Go to content types builder
    await page.goto('/content-types/builder');
    await expect(page.locator('h1')).toContainText('New Content Type');

    // Fill builder form (simplified selectors based on Field structure)
    await page.fill('input[placeholder="product"]', 'Event');
    await page.fill('input[placeholder="Products"]', 'Events');
    await page.fill('input[placeholder="products"]', 'events');
    await page.click('button:has-text("Add Field")');
    await page.waitForSelector('input[placeholder="Field name"]', { timeout: 5000 });
    await page.locator('input[placeholder="Field name"]').fill('title');
    await page.locator('.space-y-2 select, .space-y-3 select').first().selectOption('text');
    await page.click('button:has-text("Save")');

    await page.waitForURL('**/content-types');

    // Navigate to the new dynamic collection
    await page.goto('/content-types/event');
    await expect(page.locator('h1')).toContainText('Events');

    // Create a record
    await page.click('button:has-text("New Event")');
    await page.waitForURL(/content-types\/event\/new/);

    await page.locator('[data-slot="input"]').first().fill('E2E CMS Record');
    await page.click('button:has-text("Save")');

    await page.waitForURL('**/content-types/event');
    await expect(page.locator('table')).toContainText('E2E CMS Record');
  });
});
