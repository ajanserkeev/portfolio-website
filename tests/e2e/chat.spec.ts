import { expect, test } from '@playwright/test';

test.describe('Chat Agent E2E', () => {
  test('opens chat sheet, exchanges messages and closes drawer', async ({ page, browserName }) => {
    await page.route('/api/chat', async (route) => {
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

    await page.goto(browserName === 'webkit' ? '/?tier=static' : '/');

    // Click floating chat trigger
    const openBtn = page.locator('[data-testid="chat-open-btn"]');
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
