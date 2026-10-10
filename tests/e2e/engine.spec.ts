import { expect, test } from '@playwright/test';
import { liftAt, towerState } from './tower';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');

test('goes live and rides the lift to the CRM floor', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  expect(await liftAt(page)).toBeCloseTo(0, 1);
  await page.locator('[data-elevator-link="2"]').click();
  await expect.poll(() => liftAt(page), { timeout: 20_000 }).toBeGreaterThan(1.95);
  const state = await towerState(page);
  expect(state?.ready).toContain(2);
  expect(state?.drawCalls).toBeLessThanOrEqual(60);
});

test('a deep link starts at its floor without flying through the tower', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1#crm');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  expect(await liftAt(page)).toBeGreaterThan(1.9);
});

test('keeps the current floor when the phone rotates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=lite&debug=1#booking');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await expect.poll(() => liftAt(page)).toBeGreaterThan(2.9);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => liftAt(page), { timeout: 10_000 }).toBeCloseTo(3, 0);
});

test('switches to static mode when the WebGL context is lost', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.evaluate(() => {
    (window as unknown as { __tower: { loseContext(): void } }).__tower.loseContext();
  });
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'static');
  await expect(page.locator('#stage canvas')).toHaveCount(0);
});

test('survives back and forward navigation with exactly one canvas', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.goto('/en/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await expect(page.locator('#stage canvas')).toHaveCount(1);
});

test('the mode toggle switches to static mode and back', async ({ page }) => {
  await page.goto('/?tier=lite');
  const toggle = page.locator('[data-mode-toggle]');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'static');
  await expect(page).toHaveURL(/tier=static/);
  expect(await page.evaluate(() => localStorage.getItem('tower:mode'))).toBe('static');
  await page.locator('[data-mode-toggle]').click();
  // SwiftShader counts as "would be static", so turning 3D back on forces the lite tier.
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'lite');
  expect(await page.evaluate(() => localStorage.getItem('tower:mode'))).toBe('live');
});

test('reduced motion disables ambient continuous frames', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?tier=lite&debug=1#roof');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.waitForTimeout(100);
  const frames1 = await page.evaluate(
    () => (window as unknown as { __tower?: { frames: number } }).__tower?.frames ?? 0,
  );
  await page.waitForTimeout(300);
  const frames2 = await page.evaluate(
    () => (window as unknown as { __tower?: { frames: number } }).__tower?.frames ?? 0,
  );
  // Without ambient continuous loop, frames do not constantly fire
  expect(frames2 - frames1).toBeLessThanOrEqual(2);
  await context.close();
});
