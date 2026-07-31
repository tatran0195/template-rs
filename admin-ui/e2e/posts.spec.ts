import { test, expect } from '@playwright/test';

test.describe('posts e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@raisfast.dev');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('create, edit, delete post', async ({ page }) => {
    await page.goto('/posts');
    await expect(page.locator('h1')).toContainText('Posts');

    // Create
    await page.click('button:has-text("New Post")');
    await page.waitForURL('**/posts/new');
    await expect(page.locator('h1')).toContainText('New Post');

    await page.locator('[data-slot="input"]').first().fill('E2E Test Post');
    await page.locator('textarea[data-slot="textarea"]').first().fill('Excerpt text.');
    await page.locator('.space-y-4 select').first().selectOption('draft');
    await page.click('button:has-text("Save")');

    await page.waitForURL('**/posts');
    await expect(page.locator('table')).toContainText('E2E Test Post', { timeout: 10000 });

    // Edit: navigate directly to edit URL using first post id
    const postId = await page.locator('table tbody tr').first().getAttribute('data-row-id');
    // Actually the table rows don't have data-row-id; let's just click the first row text
    await page.locator('table tbody tr').filter({ hasText: 'E2E Test Post' }).first().click();
    await page.waitForURL(/posts\/\d+\/edit/);
    await expect(page.locator('h1')).toContainText('Edit Post');

    // Wait for title input and fill
    await expect(page.locator('[data-slot="input"]').first()).toHaveValue('E2E Test Post', { timeout: 10000 });
    await page.locator('[data-slot="input"]').first().fill('E2E Updated Post');
    await page.click('button:has-text("Save")');

    await page.waitForURL('**/posts');
    await expect(page.locator('table')).toContainText('E2E Updated Post', { timeout: 10000 });

    // Delete
    await page.locator('table tbody tr').filter({ hasText: 'E2E Updated Post' }).first().locator('button[aria-label="Delete"]').click();
    await page.click('button:has-text("Delete")');
    await expect(page.locator('table')).not.toContainText('E2E Updated Post', { timeout: 10000 });
  });
});
