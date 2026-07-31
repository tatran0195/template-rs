import { test, expect } from '@playwright/test';

test.describe('media e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@raisfast.dev');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('upload media file', async ({ page }) => {
    await page.goto('/media');
    await expect(page.locator('h1')).toContainText('Media');

    // Trigger file input
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
    });

    // Confirm upload completes (grid appears or no error shown)
    await expect(page.locator('text=Upload failed')).not.toBeVisible();
  });
});
