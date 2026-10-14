import { expect, test } from '@playwright/test';
import { towerState } from './tower';

test('static mode shows no hint chips', async ({ page }) => {
  await page.goto('/?tier=static#crm');
  await expect(page.locator('[data-pins]')).toBeHidden();
});

test.describe('with the 3D scene', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'WebGL runs on SwiftShader in Chromium',
  );

  test('a chip points at the deal button and runs the deal once tapped', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?tier=lite&debug=1#crm');
    await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
    const chip = page.locator('.pin');
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await expect(chip).toContainText('Нажмите кнопку');
    const before = (await towerState(page))?.frames ?? 0;
    await chip.click();
    await expect(chip).toBeHidden();
    // The deal animates: polled, because software WebGL in CI draws only a few frames a second.
    await expect
      .poll(async () => ((await towerState(page))?.frames ?? 0) - before, { timeout: 4000 })
      .toBeGreaterThan(10);
    // Used once this session: the chip stays away after a reload.
    await page.reload();
    await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
    await page.waitForTimeout(2000);
    await expect(chip).toBeHidden();
  });
});
