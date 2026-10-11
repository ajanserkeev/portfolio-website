import { expect, type Locator, test } from '@playwright/test';

const LEVELS = ['roof', 'agents', 'crm', 'booking', 'workshop', 'basement'];

async function overlap(a: Locator, b: Locator): Promise<boolean> {
  const [ra, rb] = [await a.boundingBox(), await b.boundingBox()];
  if (!ra || !rb) return false;
  return (
    ra.x < rb.x + rb.width &&
    rb.x < ra.x + ra.width &&
    ra.y < rb.y + rb.height &&
    rb.y < ra.y + ra.height
  );
}

test('renders one section and one anchor per level', async ({ page }) => {
  await page.goto('/?tier=static');
  for (const id of LEVELS) {
    await expect(page.locator(`section[data-level="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('elevator panel links to every level', async ({ page }) => {
  await page.goto('/?tier=static');
  const links = page.locator('[data-elevator-link]');
  await expect(links).toHaveCount(6);
  await links.nth(2).click();
  await expect(page).toHaveURL(/#crm$/);
  await expect(page.locator('#crm')).toBeInViewport();
});

test('the discuss-project button stays visible on every level', async ({ page }) => {
  await page.goto('/?tier=static');
  const cta = page.locator('.cta');
  for (const id of LEVELS) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
  }
});

test('has no horizontal scroll on a 360 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/?tier=static');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the English page is in English', async ({ page }) => {
  await page.goto('/en/?tier=static');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#agents-title')).toContainText('AI');
});

test('floor titles use the heading style', async ({ page }) => {
  await page.goto('/?tier=static');
  const style = await page.locator('#agents-title').evaluate((el) => {
    const c = getComputedStyle(el);
    return { family: c.fontFamily, size: Number.parseFloat(c.fontSize) };
  });
  expect(style.family).toContain('Unbounded');
  expect(style.size).toBeGreaterThanOrEqual(24);
});

test('hero kicker does not run under the top bar on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=static');
  expect(await overlap(page.locator('.topbar__brand'), page.locator('.hero .level__kicker'))).toBe(
    false,
  );
});

test('case card badges stay inside the card on a 360 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/?tier=static');
  const cards = await page.locator('.case-card').all();
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) {
    const box = await card.boundingBox();
    const nda = card.locator('.case-card__nda');
    if (!box || (await nda.count()) === 0) continue;
    const badge = await nda.boundingBox();
    expect((badge?.x ?? 0) + (badge?.width ?? 0)).toBeLessThanOrEqual(box.x + box.width + 0.5);
  }
});

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1440, height: 900 },
]) {
  test(`dock buttons do not overlap at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?tier=static');
    await expect(page.locator('[data-chat-open]')).toBeVisible();
    expect(await overlap(page.locator('.dock .cta'), page.locator('[data-chat-open]'))).toBe(false);
  });
}

test('the dock chat button opens the agent chat', async ({ page }) => {
  await page.goto('/?tier=static');
  await page.locator('[data-chat-open]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
