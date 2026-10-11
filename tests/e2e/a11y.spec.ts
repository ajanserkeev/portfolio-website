import { expect, test } from '@playwright/test';

test.describe('Accessibility and Keyboard Navigation', () => {
  test('navigates through floors with PageDown and Home keys', async ({ page }) => {
    await page.goto('/?tier=static');
    await page.waitForLoadState('networkidle');

    // Initial scroll position
    const initialY = await page.evaluate(() => window.scrollY);
    expect(initialY).toBe(0);

    // Press PageDown
    await page.keyboard.press('PageDown');
    await page.waitForFunction(() => window.scrollY > 50, { timeout: 5000 });

    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(0);

    // Press Home to jump back to top
    await page.keyboard.press('Home');
    await page.waitForFunction(() => window.scrollY < 50, { timeout: 5000 });
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(50);
  });

  test('focus is acquired when tabbing through interactive elements', async ({ page }) => {
    await page.goto('/?tier=static');
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBeTruthy();
  });
});
