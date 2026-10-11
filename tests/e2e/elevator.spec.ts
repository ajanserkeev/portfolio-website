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

test('on a phone the lift panel is a slim rail with the current floor name', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=static#crm');
  const panel = await page.locator('[data-elevator]').boundingBox();
  expect(panel?.width ?? 99).toBeLessThanOrEqual(48);
  await expect(page.locator('[data-elevator-current]')).toHaveText(/3/);
  for (const link of await page.locator('[data-elevator-link]').all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('on desktop each lift button names its floor on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?tier=static');
  const link = page.locator('[data-elevator-link="2"]');
  await expect(link).toHaveAttribute('data-label', /3/);
  await expect(page.locator('.elevator__dial')).toBeVisible();
});
