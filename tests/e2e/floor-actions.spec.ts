import { expect, test } from '@playwright/test';
import { towerState } from './tower';

const LEVELS = ['roof', 'agents', 'crm', 'booking', 'workshop', 'basement'];

test('every floor has one action button', async ({ page }) => {
  await page.goto('/?tier=static');
  for (const id of LEVELS) {
    await expect(page.locator(`button[data-hotspot][data-level="${id}"]`)).toHaveCount(1);
  }
});

test('the agents action opens the chat from the keyboard without WebGL', async ({ page }) => {
  await page.goto('/?tier=static#agents');
  await page.locator('button[data-hotspot="open-chat"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('static mode hides actions that need the 3D scene', async ({ page }) => {
  await page.goto('/?tier=static');
  await expect(page.locator('button[data-hotspot="run-deal"]')).toBeHidden();
  await expect(page.locator('button[data-hotspot="open-booking"]')).toBeVisible();
});

test.describe('with the 3D scene', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'WebGL runs on SwiftShader in Chromium',
  );

  /** Clicks the deal action once the scene is idle; returns the frame count before the click. */
  async function clickDealWhenIdle(page: import('@playwright/test').Page): Promise<number> {
    await page.goto('/?tier=lite&debug=1#crm');
    await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
    await page.waitForTimeout(6000);
    const before = (await towerState(page))?.frames ?? 0;
    await page.locator('button[data-hotspot="run-deal"]').click();
    return before;
  }

  // Within the 4.5 s interaction window: an idle scene would not draw these frames on its own.
  // Polled rather than sampled once, because software WebGL in CI draws only a few frames a second.
  const framesSince = (page: import('@playwright/test').Page, before: number) =>
    expect
      .poll(async () => ((await towerState(page))?.frames ?? 0) - before, { timeout: 4000 })
      .toBeGreaterThan(10);

  test('an action keeps rendering after the scene went idle', async ({ page }) => {
    await framesSince(page, await clickDealWhenIdle(page));
  });

  test('an action still animates with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await framesSince(page, await clickDealWhenIdle(page));
  });
});
