import { expect, type Page, test } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');

interface Target {
  level: string;
  id: string;
  x: number;
  y: number;
}

type Debug = { tapTargets: Target[]; lastTap: { level: string; actor: string } | null };

const debug = <T>(page: Page, read: (t: Debug) => T) =>
  page.evaluate(
    (fn) =>
      new Function('t', `return (${fn})(t)`)((window as unknown as { __tower: Debug }).__tower),
    read.toString(),
  ) as Promise<T>;

async function tapSomeone(page: Page, hash: string, level: string, idPattern: RegExp) {
  await page.setViewportSize({ width: 1280, height: 800 });
  // The deal hint chip floats near the CRM robot: mark it used so it stays away.
  await page.addInitScript(() => sessionStorage.setItem('tower:hints-used', '["run-deal"]'));
  await page.goto(`/?tier=lite&debug=1#${hash}`);
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  let target: Target | undefined;
  await expect
    .poll(
      async () => {
        const targets = await debug(page, (t) => t.tapTargets);
        // Someone on this floor, in the open part of the screen (left of the text card).
        target = targets.find(
          (t) => t.level === level && idPattern.test(t.id) && t.x > 40 && t.x < 700 && t.y > 80,
        );
        return target !== undefined;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  if (!target) throw new Error('nobody to tap');
  await page.mouse.click(target.x, target.y);
  await expect.poll(() => debug(page, (t) => t.lastTap)).toEqual({ level, actor: target.id });
}

test('a founder in the basement reacts to a tap', async ({ page }) => {
  await tapSomeone(page, 'basement', 'basement', /^(lead|creative|automation)$/);
});

test('a robot on the CRM floor reacts to a tap', async ({ page }) => {
  await tapSomeone(page, 'crm', 'crm', /./);
});
