import { expect, test } from '@playwright/test';

test('the 3D switch lives in the menu and works from the keyboard', async ({ page }) => {
  await page.goto('/?tier=static');
  const button = page.locator('[data-menu-button]');
  await expect(page.locator('[data-mode-toggle]')).toBeHidden();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-mode-toggle]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-mode-toggle]')).toBeHidden();
  await expect(button).toBeFocused();
});

test('the sound button is labelled in the page language', async ({ page }) => {
  await page.goto('/en/?tier=static');
  await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-label', /sound/i);
});
