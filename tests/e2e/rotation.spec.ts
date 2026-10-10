import { expect, type Page, test } from '@playwright/test';
import { liftAt } from './tower';

/** Index of the level section under the middle of the viewport. */
function floorInView(page: Page): Promise<number> {
  return page.evaluate(() => {
    const line = window.innerHeight / 2;
    for (const section of document.querySelectorAll<HTMLElement>('section.level[data-index]')) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) return Number(section.dataset.index);
    }
    return -1;
  });
}

// Safari has no scroll anchoring; turn it off so every engine behaves like Safari.
const noAnchoring = 'html, body { overflow-anchor: none !important; }';

test('static mode keeps the floor when the phone rotates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=static#booking');
  await page.addStyleTag({ content: noAnchoring });
  await expect.poll(() => floorInView(page)).toBe(3);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => floorInView(page)).toBe(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => floorInView(page)).toBe(3);
});

test('3D mode keeps the floor when the phone rotates without scroll anchoring', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=lite&debug=1#booking');
  await page.addStyleTag({ content: noAnchoring });
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await expect.poll(() => liftAt(page)).toBeGreaterThan(2.9);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => floorInView(page)).toBe(3);
  await expect.poll(() => liftAt(page)).toBeCloseTo(3, 1);
});
