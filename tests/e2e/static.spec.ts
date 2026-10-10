import { expect, test } from '@playwright/test';

test('static tier shows no canvas', async ({ page }) => {
  await page.goto('/?tier=static');
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'static');
  await expect(page.locator('#stage canvas')).toHaveCount(0);
});

test('reduced motion is reflected on <html>', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?tier=static');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await context.close();
});
