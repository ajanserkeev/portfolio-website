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

test('the founders sit in the basement within the draw call budget', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1#basement');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  const state = () =>
    page.evaluate(() => {
      const t = (window as unknown as { __tower: { actors: number; drawCalls: number } }).__tower;
      return { actors: t.actors, drawCalls: t.drawCalls };
    });
  await expect
    .poll(async () => (await state()).actors, { timeout: 20_000 })
    .toBeGreaterThanOrEqual(3);
  expect((await state()).drawCalls).toBeLessThanOrEqual(60);
});

test('a shot of the basement waits for the founders', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 720 });
  await page.goto('/?shot=basement');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-shot-ready', 'true', { timeout: 30_000 });
  expect(Number(await html.getAttribute('data-shot-people'))).toBeGreaterThanOrEqual(3);
});
