import { expect, test } from '@playwright/test';

test('home page renders in Russian without console errors', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  // WebKit on CI has no reliable WebGL; static mode keeps this test about the page itself.
  await page.goto(browserName === 'webkit' ? '/?tier=static' : '/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page).toHaveTitle(/ИИ-агенты/);
  expect(errors).toEqual([]);
});
