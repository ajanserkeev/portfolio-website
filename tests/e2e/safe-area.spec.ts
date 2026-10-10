import { expect, test } from '@playwright/test';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Safe-area emulation is a Chromium CDP feature',
);

test('content stays clear of the notch in landscape', async ({ page }) => {
  const notch = 47;
  await page.setViewportSize({ width: 844, height: 390 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { left: notch, right: notch, top: 0, bottom: 21 },
  });
  await page.goto('/?tier=static#agents');
  const box = async (selector: string) => {
    const found = await page.locator(selector).first().boundingBox();
    if (!found) throw new Error(`${selector} is not visible`);
    return found;
  };
  const right = 844 - notch;
  expect((await box('.topbar__brand')).x).toBeGreaterThanOrEqual(notch);
  expect((await box('#agents')).x).toBeGreaterThanOrEqual(notch);
  const elevator = await box('.elevator');
  expect(elevator.x + elevator.width).toBeLessThanOrEqual(right);
  const cta = await box('.cta');
  expect(cta.x).toBeGreaterThanOrEqual(notch);
});
