import { expect, test } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');

test('floors keep working without the cast file', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/cast*.glb', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/?tier=lite&debug=1#agents');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => (window as unknown as { __tower: { actors: number } }).__tower.actors,
    ),
  ).toBe(0);
});
