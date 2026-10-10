import { chromium, expect, test } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'Real bfcache needs Chromium');

type Probe = { __marker?: string; __restored?: boolean; __tower?: { frames: number } };

test('restores from the back-forward cache with one live canvas that keeps rendering', async ({
  baseURL,
}) => {
  // Playwright disables bfcache, and headless Chromium never restores from it: run headed
  // (CI wraps e2e in xvfb-run) with the cache re-enabled.
  const browser = await chromium.launch({
    headless: false,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.goto(`${baseURL}/?tier=lite&debug=1`);
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.evaluate(() => {
    const probe = window as unknown as Probe;
    probe.__marker = 'before-navigation';
    window.addEventListener('pageshow', (event) => {
      probe.__restored = event.persisted;
    });
  });
  await page.goto(`${baseURL}/en/?tier=static`);
  // A bfcache restore fires no load event, so wait only for the navigation to commit.
  await page.goBack({ waitUntil: 'commit' });

  await expect.poll(() => page.evaluate(() => (window as unknown as Probe).__restored)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as Probe).__marker)).toBe(
    'before-navigation',
  );
  await expect(page.locator('#stage canvas')).toHaveCount(1);
  const framesBefore = await page.evaluate(() => (window as unknown as Probe).__tower?.frames ?? 0);
  await page.mouse.wheel(0, 1500);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Probe).__tower?.frames ?? 0))
    .toBeGreaterThan(framesBefore);
  await browser.close();
});
