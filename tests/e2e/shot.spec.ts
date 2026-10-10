import { expect, test } from '@playwright/test';
import { liftAt, towerState } from './tower';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');

test('shot mode frames one level and hides the interface', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await page.goto('/?shot=agents');
  await expect(page.locator('html')).toHaveAttribute('data-shot-ready', 'true', {
    timeout: 30_000,
  });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.cta')).toBeHidden();
});

test('all six floors load from GLB and stay within draw call budget', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1#agents');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  let sources = await page.evaluate(
    () => (window as unknown as { __tower?: { sources: Record<number, string> } }).__tower?.sources,
  );
  expect(sources?.[0]).toBe('glb');
  expect(sources?.[1]).toBe('glb');
  expect(sources?.[2]).toBe('glb');
  expect((await towerState(page))?.drawCalls).toBeLessThanOrEqual(60);

  // Navigate to basement to load remaining floors
  await page.locator('[data-elevator-link="5"]').click();
  await expect.poll(() => liftAt(page), { timeout: 20_000 }).toBeGreaterThan(4.9);
  sources = await page.evaluate(
    () => (window as unknown as { __tower?: { sources: Record<number, string> } }).__tower?.sources,
  );
  expect(sources?.[3]).toBe('glb');
  expect(sources?.[4]).toBe('glb');
  expect(sources?.[5]).toBe('glb');
  expect((await towerState(page))?.drawCalls).toBeLessThanOrEqual(60);
});
