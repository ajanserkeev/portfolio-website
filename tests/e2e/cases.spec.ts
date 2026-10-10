import { expect, test } from '@playwright/test';

test('renders case cards on corresponding floors in Russian', async ({ page }) => {
  await page.goto('/?tier=static');

  // Floor 4: agents
  const agentsSection = page.locator('.level[data-level="agents"]');
  await expect(agentsSection.locator('[data-case-id="med-agent"]')).toBeVisible();
  await expect(agentsSection.locator('[data-case-id="med-agent"]')).toContainText('ИИ-диспетчер');
  await expect(
    agentsSection.locator('[data-case-id="med-agent"] .case-card__metric-val').first(),
  ).toBeVisible();

  // Floor 3: crm
  const crmSection = page.locator('.level[data-level="crm"]');
  await expect(crmSection.locator('[data-case-id="logistics-crm"]')).toBeVisible();

  // Floor 2: booking
  const bookingSection = page.locator('.level[data-level="booking"]');
  await expect(bookingSection.locator('[data-case-id="hotel-booking"]')).toBeVisible();

  // Floor 1: workshop
  const workshopSection = page.locator('.level[data-level="workshop"]');
  await expect(workshopSection.locator('[data-case-id="fintech-portal"]')).toBeVisible();

  // Basement: process, team, faq, and footer
  const basement = page.locator('.level[data-level="basement"]');
  await expect(basement.locator('.process-card')).toHaveCount(4);
  await expect(basement.locator('.team-card')).toHaveCount(3);
  await expect(basement.locator('.faq-item')).toHaveCount(4);
  await expect(basement.locator('.footer-legal')).toBeVisible();
});

test('renders case cards on corresponding floors in English', async ({ page }) => {
  await page.goto('/en/?tier=static');

  const agentsSection = page.locator('.level[data-level="agents"]');
  await expect(agentsSection.locator('[data-case-id="med-agent"]')).toBeVisible();
  await expect(agentsSection.locator('[data-case-id="med-agent"]')).toContainText(
    'AI Receptionist',
  );
});
