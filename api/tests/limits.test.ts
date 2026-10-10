import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { initDatabase } from '../src/db';
import { createRateLimiter } from '../src/limits';

describe('Rate Limiter Middleware', () => {
  it('allows requests within limit and sets rate limit headers', async () => {
    const db = initDatabase(':memory:');
    const app = new Hono();

    app.use(
      '/api/test',
      createRateLimiter({
        db,
        windowMs: 60_000,
        max: 3,
        keyGenerator: () => 'test-client',
      }),
    );

    app.get('/api/test', (c) => c.json({ ok: true }));

    // Request 1
    const res1 = await app.request('/api/test');
    expect(res1.status).toBe(200);
    expect(res1.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res1.headers.get('X-RateLimit-Remaining')).toBe('2');

    // Request 2
    const res2 = await app.request('/api/test');
    expect(res2.status).toBe(200);
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('1');

    // Request 3
    const res3 = await app.request('/api/test');
    expect(res3.status).toBe(200);
    expect(res3.headers.get('X-RateLimit-Remaining')).toBe('0');

    // Request 4: Over limit
    const res4 = await app.request('/api/test');
    expect(res4.status).toBe(429);
    const data4 = await res4.json();
    expect(data4.code).toBe('RATE_LIMITED');
    expect(res4.headers.get('Retry-After')).toBeTruthy();

    db.close();
  });
});
