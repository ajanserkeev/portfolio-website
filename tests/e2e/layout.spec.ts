import { expect, test } from '@playwright/test';

const LEVELS = ['roof', 'agents', 'crm', 'booking', 'workshop', 'basement'];

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
