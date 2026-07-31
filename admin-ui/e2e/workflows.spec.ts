import { test, expect } from '@playwright/test';

test.describe('workflows e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@raisfast.dev');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('drag workflow node and save workflow', async ({ page }) => {
    await page.goto('/workflows/editor');
    await expect(page.locator('input[placeholder*="Name"]')).toBeVisible();

    // Name the workflow
    await page.fill('input[placeholder*="Name"]', 'E2E Workflow');

    // Drag a step node from palette onto canvas using mouse events
    const paletteItem = page.locator('text=Step').first();
    const box = await paletteItem.boundingBox();
    const canvas = page.locator('.react-flow__pane');
    const canvasBox = await canvas.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox!.x + 200, canvasBox!.y + 100);
    await page.mouse.up();

    // Confirm node appears
    await expect(page.locator('.react-flow__node')).toBeVisible();

    // Save workflow
    await page.click('button:has-text("Save")');
    // Wait for save mutation to complete (button re-enables)
    await expect(page.locator('button:has-text("Save")')).not.toBeDisabled();
  });
});
