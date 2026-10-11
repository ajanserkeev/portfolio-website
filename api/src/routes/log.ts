import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { z } from 'zod';
import type { TelegramNotifier } from '../integrations/telegram';

export const clientLogSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000),
  stack: z.string().trim().max(5000).optional(),
  url: z.string().trim().max(1000).optional(),
  level: z.enum(['error', 'warn', 'info']).default('error'),
  userAgent: z.string().trim().max(500).optional(),
});

export type ClientLogPayload = z.infer<typeof clientLogSchema>;

export interface LogRouteOptions {
  db: DatabaseSync;
  telegramNotifier?: TelegramNotifier;
}

export function createLogRoute(options: LogRouteOptions) {
  const { db, telegramNotifier } = options;
  const router = new Hono();

  router.post('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, 400);
    }

    const parseResult = clientLogSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return c.json(
        {
          error: issue?.message ?? 'Validation failed',
          code: 'INVALID_LOG',
        },
        400,
      );
    }

    const data = parseResult.data;
    const logId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown';
    const userAgent = data.userAgent ?? c.req.header('user-agent') ?? null;

    try {
      db.prepare(`
        INSERT INTO error_logs (id, created_at, level, message, stack, url, user_agent, ip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        createdAt,
        data.level,
        data.message,
        data.stack ?? null,
        data.url ?? null,
        userAgent,
        ip,
      );
    } catch (err) {
      console.error('[log] Failed to insert error log into SQLite:', err);
      return c.json({ error: 'Failed to record log', code: 'INTERNAL_ERROR' }, 500);
    }

    // If critical/error and notifier configured, we can fire and forget telegram alert
    if (data.level === 'error' && telegramNotifier) {
      telegramNotifier
        .notifyLead({
          id: logId,
          name: 'SYSTEM CLIENT ERROR',
          contact: urlSnippet(data.url),
          channel: 'telegram',
          message: `${data.message}\n${data.stack ? data.stack.slice(0, 300) : ''}`,
          locale: 'ru',
        })
        .catch((err) => {
          console.error('[log] Failed to notify telegram of client error:', err);
        });
    }

    return c.json({ ok: true, id: logId }, 201);
  });

  return router;
}

function urlSnippet(url?: string): string {
  if (!url) return 'Unknown URL';
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url.slice(0, 50);
  }
}
