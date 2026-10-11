import { expect, test } from '@playwright/test';

test.describe('Preact Islands E2E', () => {
  test('Calculator interacts and recalculates estimated range', async ({ page, browserName }) => {
    await page.goto(browserName === 'webkit' ? '/?tier=static' : '/');

    const calc = page.locator('#project-calculator');
    await calc.scrollIntoViewIfNeeded();
    await expect(calc).toBeVisible();

    const priceText = page.locator('[data-testid="estimate-price"]');
    await expect(priceText).toBeVisible();
    const initialPrice = await priceText.textContent();
    expect(initialPrice).toContain('$');

    // Click Enterprise complexity button
    const enterpriseBtn = calc.getByRole('button', { name: /Энтерпрайз/i });
    if (await enterpriseBtn.isVisible()) {
      await enterpriseBtn.click();
      const newPrice = await priceText.textContent();
      expect(newPrice).not.toEqual(initialPrice);
    }
  });

  test('LeadForm validates, submits and displays success confirmation', async ({
    page,
    browserName,
  }) => {
    await page.route('/api/lead', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 'test-lead-uuid-123' }),
      });
    });

    await page.goto(browserName === 'webkit' ? '/?tier=static' : '/');

    const form = page.locator('[data-testid="lead-form"]');
    await form.scrollIntoViewIfNeeded();
    await expect(form).toBeVisible();

    await page.locator('[data-testid="lead-input-name"]').fill('Aman');
    await page.locator('[data-testid="lead-input-contact"]').fill('@aman_telegram');
    await page.locator('[data-testid="lead-checkbox-consent"]').check();

    await page.locator('[data-testid="lead-button-submit"]').click();

    await expect(page.locator('[data-testid="lead-form-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="lead-form-success"]')).toContainText(
      /Заявка принята/i,
    );
  });

  test('BookingWidget selects slot and completes reservation', async ({ page, browserName }) => {
    const mockSlots = [
      {
        start: '2026-10-15T06:00:00.000Z',
        end: '2026-10-15T06:30:00.000Z',
        date: '2026-10-15',
        time: '11:00',
      },
      {
        start: '2026-10-15T06:30:00.000Z',
        end: '2026-10-15T07:00:00.000Z',
        date: '2026-10-15',
        time: '11:30',
      },
    ];

    await page.route('/api/slots*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          slots: mockSlots,
          count: mockSlots.length,
        }),
      });
    });

    await page.route('/api/book', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          id: 'mock-booking-id',
          status: 'confirmed',
        }),
      });
    });

    await page.goto(browserName === 'webkit' ? '/?tier=static' : '/');

    const widget = page.locator('#booking-widget');
    await widget.scrollIntoViewIfNeeded();
    await expect(widget).toBeVisible();

    // Select slot chip
    const slotChip = page.locator('[data-testid="slot-time-11:00"]');
    await expect(slotChip).toBeVisible();
    await slotChip.click();

    // Fill booking form
    const bookingForm = page.locator('[data-testid="booking-form"]');
    await expect(bookingForm).toBeVisible();

    await page.locator('[data-testid="booking-input-name"]').fill('Aman');
    await page.locator('[data-testid="booking-input-contact"]').fill('+7 701 555 4433');
    await page.locator('[data-testid="booking-consent"]').check();

    await page.locator('[data-testid="booking-submit-btn"]').click();

    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-success"]')).toContainText(
      /Созвон забронирован/i,
    );
  });
});
