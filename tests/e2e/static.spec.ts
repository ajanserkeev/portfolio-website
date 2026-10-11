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

test('static mode shows real floor posters', async ({ page }) => {
  await page.goto('/?tier=static#agents');
  const img = page.locator('[data-static-level="agents"] img');
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(1200);
});
