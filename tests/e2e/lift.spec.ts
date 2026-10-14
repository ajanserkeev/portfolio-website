import { expect, test } from '@playwright/test';
import { liftAt, towerState } from './tower';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');

const LEVEL_HEIGHT = 4;

for (const [hash, level] of [
  ['roof', 0],
  ['booking', 3],
  ['basement', 5],
] as const) {
  test(`the lift waits open at ${hash} within the draw call budget`, async ({ page }) => {
    await page.goto(`/?tier=lite&debug=1#${hash}`);
    await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
    await expect
      .poll(async () => (await towerState(page))?.lift.doors, { timeout: 20_000 })
      .toBe(1);
    const state = await towerState(page);
    expect(state?.lift.cabinY).toBeCloseTo(-level * LEVEL_HEIGHT, 1);
    expect(state?.drawCalls).toBeLessThanOrEqual(60);
  });
}

test('the doors close for the ride and open again on arrival', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await expect.poll(async () => (await towerState(page))?.lift.doors, { timeout: 20_000 }).toBe(1);
  await page.locator('[data-elevator-link="2"]').click();
  await expect
    .poll(async () => (await towerState(page))?.lift.doors, { timeout: 10_000 })
    .toBeLessThan(1);
  await expect.poll(() => liftAt(page), { timeout: 20_000 }).toBeGreaterThan(1.99);
  await expect.poll(async () => (await towerState(page))?.lift.doors, { timeout: 20_000 }).toBe(1);
  expect((await towerState(page))?.lift.cabinY).toBeCloseTo(-2 * LEVEL_HEIGHT, 1);
});
