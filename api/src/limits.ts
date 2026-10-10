import type { DatabaseSync } from 'node:sqlite';
import type { MiddlewareHandler } from 'hono';

export interface RateLimitOptions {
  db: DatabaseSync;
  windowMs?: number;
  max?: number;
  keyGenerator?: (c: Parameters<MiddlewareHandler>[0]) => string;
}

export function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  const { db, windowMs = 60_000, max = 30 } = options;

  return async (c, next) => {
    const now = Date.now();
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      '127.0.0.1';
    const key = options.keyGenerator ? options.keyGenerator(c) : `ip:${ip}`;

    const existing = db.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').get(key) as
      | { count: number; reset_at: number }
      | undefined;

    if (existing && existing.reset_at > now) {
      if (existing.count >= max) {
        const retryAfterSec = Math.max(1, Math.ceil((existing.reset_at - now) / 1000));
        c.header('Retry-After', String(retryAfterSec));
        c.header('X-RateLimit-Limit', String(max));
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', String(Math.ceil(existing.reset_at / 1000)));

        return c.json(
          {
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
          },
          429,
        );
      }

      const nextCount = existing.count + 1;
      db.prepare('UPDATE rate_limits SET count = ? WHERE key = ?').run(nextCount, key);

      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', String(max - nextCount));
      c.header('X-RateLimit-Reset', String(Math.ceil(existing.reset_at / 1000)));
    } else {
      const resetAt = now + windowMs;
      db.prepare('INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, ?, ?)').run(
        key,
        1,
        resetAt,
      );

      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', String(max - 1));
      c.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
    }

    await next();
  };
}
