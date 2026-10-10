import { expect, test } from '@playwright/test';
import { liftAt } from './tower';

test('marks the floor in view as current (static mode)', async ({ page }) => {
  await page.goto('/?tier=static');
  const links = page.locator('[data-elevator-link]');
  await links.nth(4).click();
  await expect(links.nth(4)).toHaveAttribute('aria-current', 'location');
});

test('follows the lift in 3D mode', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  const links = page.locator('[data-elevator-link]');
  await links.nth(2).click();
  await expect.poll(() => liftAt(page)).toBeGreaterThan(1.95);
  await expect(links.nth(2)).toHaveAttribute('aria-current', 'location');
});
