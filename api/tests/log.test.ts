import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { initDatabase } from '../src/db';
import { FakeTelegramNotifier } from '../src/integrations/telegram';

describe('POST /api/log', () => {
  function setupTestApp() {
    const config = loadConfig({ NODE_ENV: 'test', SQLITE_PATH: ':memory:' });
    const db = initDatabase(':memory:');
    const telegramNotifier = new FakeTelegramNotifier();
    const app = createApp({ config, db, telegramNotifier });

    return { app, db, telegramNotifier };
  }

  it('successfully logs client error and stores in database', async () => {
    const { app, db } = setupTestApp();

    const res = await app.request('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'WebGL context lost: memory pressure',
        stack: 'Error: WebGL context lost\n  at Canvas.render (main.js:12:34)',
        url: 'https://ajanserkeev.dev/?tier=high',
        level: 'error',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();

    const row = db.prepare('SELECT * FROM error_logs WHERE id = ?').get(body.id) as Record<
      string,
      unknown
    >;
    expect(row).toBeDefined();
    expect(row.message).toBe('WebGL context lost: memory pressure');
    expect(row.level).toBe('error');
    expect(row.url).toBe('https://ajanserkeev.dev/?tier=high');
  });

  it('rejects payload without a valid message', async () => {
    const { app } = setupTestApp();

    const res = await app.request('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_LOG');
  });

  it('rejects payload with excessive message length', async () => {
    const { app } = setupTestApp();

    const res = await app.request('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'a'.repeat(1500),
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_LOG');
  });

  it('enforces rate limit of 10 requests per minute', async () => {
    const { app } = setupTestApp();

    // 10 valid requests should succeed
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.1' },
        body: JSON.stringify({ message: `Client error ${i}` }),
      });
      expect(res.status).toBe(201);
    }

    // 11th request from same IP should be blocked
    const blockedRes = await app.request('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.1' },
      body: JSON.stringify({ message: 'Client error 11' }),
    });

    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.code).toBe('RATE_LIMITED');
  });
});
