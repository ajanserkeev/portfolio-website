import { expect, test } from '@playwright/test';

test.describe('Chat Agent E2E', () => {
  test('opens chat sheet, exchanges messages and closes drawer', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      const sseBody = [
        'data: {"type":"token","content":"Здравствуйте! "}\n\n',
        'data: {"type":"token","content":"Чем могу помочь?"}\n\n',
        'data: {"type":"done","sessionId":"test-session-123"}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      });
    });

    await page.goto('/?tier=static');

    // Open the chat from the bottom dock
    const openBtn = page.locator('[data-chat-open]');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Verify chat drawer opened
    const sheet = page.locator('[data-testid="chat-sheet"]');
    await expect(sheet).toBeVisible();

    // Type a message and send
    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toBeVisible();
    await input.fill('Привет!');

    const sendBtn = page.locator('[data-testid="chat-send-btn"]');
    await sendBtn.click();

    // Verify response received
    await expect(sheet).toContainText(/Чем могу помочь/i);

    // Close chat drawer
    const closeBtn = page.locator('[data-testid="chat-close-btn"]');
    await closeBtn.click();
    await expect(sheet).not.toBeVisible();
  });
});

test.describe('Chat sheet', () => {
  test('is light, in the page language and keyboard friendly', async ({ page }) => {
    await page.goto('/en/?tier=static');
    const opener = page.locator('[data-chat-open]');
    await opener.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeFocused();
    const light = await sheet.evaluate((el) => {
      const [r = 0, g = 0, b = 0] = (
        getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? []
      ).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
    expect(light).toBeGreaterThan(0.8);
    expect(await sheet.innerText()).not.toMatch(/[А-Яа-яЁё]/);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();
  });
});

test('a click on the chat button before the island hydrates still opens the chat', async ({
  page,
}) => {
  // Hold the island's JS back so the click lands before ChatSheet subscribes to the bus.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/ChatSheet*.js', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/?tier=static', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-chat-open]').click();
  release();
  await expect(page.getByRole('dialog')).toBeVisible();
});
