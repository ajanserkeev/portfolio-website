import { expect, test } from '@playwright/test';

// A font without Cyrillic glyphs falls back to monospace, so the widths would match.
test('heading and body fonts carry real Cyrillic glyphs', async ({ page }) => {
  await page.goto('/?tier=static');
  const widths = await page.evaluate(async () => {
    await document.fonts.load('700 40px Unbounded', 'Ж');
    await document.fonts.load('400 40px Manrope', 'Ж');
    const ctx = document.createElement('canvas').getContext('2d');
    const width = (font: string) => {
      if (!ctx) return 0;
      ctx.font = font;
      return ctx.measureText('ЖЩЮ').width;
    };
    return {
      fallback: width('400 40px monospace'),
      unbounded: width('700 40px Unbounded, monospace'),
      manrope: width('400 40px Manrope, monospace'),
    };
  });
  expect(Math.abs(widths.unbounded - widths.fallback)).toBeGreaterThan(2);
  expect(Math.abs(widths.manrope - widths.fallback)).toBeGreaterThan(2);
});
