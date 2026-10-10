import { expect, test } from '@playwright/test';

test('renders privacy policy in Russian and links back to home', async ({ page }) => {
  await page.goto('/privacy/');

  await expect(page).toHaveTitle(/Политика конфиденциальности/);
  await expect(page.locator('h1')).toContainText('Политика конфиденциальности');
  await expect(page.locator('main')).toContainText('Республики Казахстан');
  await expect(page.locator('main')).toContainText('Согласие на обработку');

  const backLink = page.locator('[data-back-to-home]').first();
  await expect(backLink).toHaveAttribute('href', '/');
  await backLink.click();
  await expect(page).toHaveURL(/\/(#.*)?$/);
});

test('renders privacy policy in English and links back to home', async ({ page }) => {
  await page.goto('/en/privacy/');

  await expect(page).toHaveTitle(/Privacy Policy/);
  await expect(page.locator('h1')).toContainText('Privacy Policy');
  await expect(page.locator('main')).toContainText('General Provisions');
  await expect(page.locator('main')).toContainText('Consent to Personal Data');

  const backLink = page.locator('[data-back-to-home]').first();
  await expect(backLink).toHaveAttribute('href', '/en/');
  await backLink.click();
  await expect(page).toHaveURL(/\/en\/(#.*)?$/);
});

test('footer legal link navigates to privacy policy', async ({ page }) => {
  await page.goto('/?tier=static#basement');

  const privacyLink = page.locator('.footer-legal a[href*="privacy"]').first();
  await expect(privacyLink).toBeVisible();
  await privacyLink.click();

  await expect(page).toHaveURL(/\/privacy\/?$/);
});
