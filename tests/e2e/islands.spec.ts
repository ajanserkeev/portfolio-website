import { expect, type Locator, test } from '@playwright/test';

/** Astro drops the `ssr` attribute once an island has hydrated; typing earlier is lost. */
async function hydrated(inner: Locator): Promise<void> {
  await inner.scrollIntoViewIfNeeded();
  await expect(inner.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', /.*/);
}

/** Relative luminance of an element's own background, 0 (black) … 1 (white). */
async function luminance(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const [r = 0, g = 0, b = 0] = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? []).map(
      Number,
    );
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
}

test.describe('Preact Islands E2E', () => {
  test('Calculator interacts and recalculates estimated range', async ({ page, browserName }) => {
    await page.goto(browserName === 'webkit' ? '/?tier=static' : '/');

    const calc = page.locator('#project-calculator');
    await hydrated(calc);
    await expect(calc).toBeVisible();

    const priceText = page.locator('[data-testid="estimate-price"]');
    await expect(priceText).toBeVisible();
    const initialPrice = await priceText.textContent();
    expect(initialPrice).toContain('$');

    const largeBtn = calc.getByRole('button', { name: /Крупный/i });
    await largeBtn.click();
    await expect(largeBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(priceText).not.toHaveText(initialPrice ?? '');
  });

  test('Calculator uses the light theme and English copy on /en/', async ({ page }) => {
    await page.goto('/en/?tier=static');
    const calc = page.locator('[data-testid="calculator"]');
    await hydrated(calc);
    expect(await luminance(calc)).toBeGreaterThan(0.8);
    expect(await calc.innerText()).not.toMatch(/[А-Яа-яЁё]/);
  });

  test('Calculator is prefilled from the pain picked on the roof', async ({ page }) => {
    await page.goto('/?tier=static');
    const calc = page.locator('[data-testid="calculator"]');
    await hydrated(calc);
    await page.locator('[data-pain-option="need-booking"]').click();
    await expect(calc.getByRole('button', { name: /Онлайн-запись/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(calc.getByRole('button', { name: /ИИ-агенты/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
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
    await hydrated(form);
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
    await hydrated(widget);
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

  test('BookingWidget falls back to other channels when the slots API is down', async ({
    page,
  }) => {
    await page.route('**/api/slots**', (route) => route.fulfill({ status: 503, body: '' }));
    await page.goto('/?tier=static#booking');
    // client:visible: the island hydrates only once it is on screen.
    await page.locator('#booking-widget').scrollIntoViewIfNeeded();
    const fallback = page.getByTestId('booking-unavailable');
    await expect(fallback).toBeVisible();
    await expect(fallback.getByRole('link')).toHaveCount(2);
    await expect(fallback.getByRole('link').last()).toHaveAttribute('href', '#basement');
  });
});

test('island controls stay inside their panel in the narrow desktop column', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?tier=static');
  const calc = page.locator('[data-testid="calculator"]');
  await calc.scrollIntoViewIfNeeded();
  const panel = await calc.boundingBox();
  for (const button of await calc.locator('button').all()) {
    const box = await button.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (panel?.x ?? 0) + (panel?.width ?? 0),
    );
  }
});

test.describe('LeadForm', () => {
  test('uses the light theme and English copy on /en/', async ({ page }) => {
    await page.goto('/en/?tier=static');
    const form = page.locator('[data-testid="lead-form"]');
    await hydrated(form);
    expect(await luminance(form)).toBeGreaterThan(0.8);
    expect(await form.innerText()).not.toMatch(/[А-Яа-яЁё]/);
  });

  test('shows a readable error when the request fails', async ({ page }) => {
    await page.route('**/api/lead', (route) =>
      route.fulfill({ status: 502, contentType: 'text/html', body: '<html>Bad gateway</html>' }),
    );
    await page.goto('/?tier=static');
    const form = page.locator('[data-testid="lead-form"]');
    await hydrated(form);
    await page.getByTestId('lead-input-name').fill('Аман');
    await page.getByTestId('lead-input-contact').fill('@aman');
    await page.getByTestId('lead-checkbox-consent').check();
    await page.getByTestId('lead-button-submit').click();
    const error = page.getByTestId('lead-form-error');
    await expect(error).toContainText(/Не получилось отправить/);
    await expect(error).not.toContainText(/Unexpected|Failed|JSON/);
  });

  test('sends the pain picked earlier in the session', async ({ page }) => {
    let body: Record<string, unknown> = {};
    await page.route('**/api/lead', async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"id":"x"}' });
    });
    await page.goto('/?tier=static');
    await page.locator('[data-pain-option="need-site"]').click();
    await page.reload();
    const form = page.locator('[data-testid="lead-form"]');
    await hydrated(form);
    await page.getByTestId('lead-input-name').fill('Аман');
    await page.getByTestId('lead-input-contact').fill('@aman');
    await page.getByTestId('lead-checkbox-consent').check();
    await page.getByTestId('lead-button-submit').click();
    await expect(page.getByTestId('lead-form-success')).toBeVisible();
    expect(body.pain).toBe('need-site');
  });
});

test.describe('BookingWidget', () => {
  const slots = [
    {
      start: '2026-10-15T06:00:00.000Z',
      end: '2026-10-15T06:30:00.000Z',
      date: '2026-10-15',
      time: '11:00',
    },
    {
      start: '2026-10-16T06:00:00.000Z',
      end: '2026-10-16T06:30:00.000Z',
      date: '2026-10-16',
      time: '11:00',
    },
  ];

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/slots**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, slots }),
      }),
    );
  });

  test('sends consent and shows readable dates in the Almaty time zone', async ({ page }) => {
    let body: Record<string, unknown> = {};
    await page.route('**/api/book', async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: '{"ok":true,"id":"b"}',
      });
    });
    await page.goto('/?tier=static');
    const widget = page.locator('#booking-widget');
    await hydrated(widget);
    await expect(page.getByTestId('slot-date-2026-10-15')).toHaveText(/15 окт/);
    await expect(widget).toContainText(/Алмат/);
    await page.getByTestId('slot-time-11:00').click();
    await page.getByTestId('booking-input-name').fill('Аман');
    await page.getByTestId('booking-input-contact').fill('@aman');
    await page.getByTestId('booking-consent').check();
    await page.getByTestId('booking-submit-btn').click();
    await expect(page.getByTestId('booking-success')).toContainText(/15 окт/);
    await expect(page.getByTestId('booking-success')).not.toContainText(/UTC\)/);
    expect(body.consent).toBe(true);
    expect(body.slotStart).toBe('2026-10-15T06:00:00.000Z');
  });

  test('uses the light theme and English copy on /en/', async ({ page }) => {
    await page.goto('/en/?tier=static');
    const widget = page.locator('#booking-widget');
    await hydrated(widget);
    await expect(page.getByTestId('slot-time-11:00')).toBeVisible();
    expect(await luminance(widget)).toBeGreaterThan(0.8);
    expect(await widget.innerText()).not.toMatch(/[А-Яа-яЁё]/);
  });
});

test('contact channels fit the narrow phone panel', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/?tier=static');
  const form = page.locator('[data-testid="lead-form"]');
  await hydrated(form);
  const panel = await form.boundingBox();
  for (const button of await form.locator('.ui-segmented button').all()) {
    const box = await button.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (panel?.x ?? 0) + (panel?.width ?? 0),
    );
  }
});
