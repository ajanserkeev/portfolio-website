import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { handleScriptedChat } from '../agent/scripted';
import type { ApiConfig } from '../config';

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty'),
  sessionId: z.string().optional(),
  locale: z.enum(['ru', 'en']).default('ru'),
  pain: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface ChatRouteOptions {
  db: DatabaseSync;
  config?: ApiConfig;
}

export function createChatRoute(options: ChatRouteOptions) {
  const { db } = options;
  const router = new Hono();

  router.post('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, 400);
    }

    const parseResult = chatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return c.json(
        {
          error: parseResult.error.issues[0]?.message ?? 'Validation error',
          code: 'VALIDATION_ERROR',
        },
        400,
      );
    }

    const { message, sessionId, locale, pain } = parseResult.data;

    // Record or update session in SQLite
    const activeSessionId = sessionId || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    try {
      const existing = db
        .prepare('SELECT id, request_count FROM sessions WHERE id = ?')
        .get(activeSessionId) as { id: string; request_count: number } | undefined;

      if (existing) {
        db.prepare(
          'UPDATE sessions SET last_active_at = ?, request_count = request_count + 1 WHERE id = ?',
        ).run(nowIso, activeSessionId);
      } else {
        db.prepare(`
          INSERT INTO sessions (id, created_at, last_active_at, locale, pain, request_count, tokens_used, cost_usd)
          VALUES (?, ?, ?, ?, ?, 1, 0, 0.0)
        `).run(activeSessionId, nowIso, nowIso, locale, pain ?? null);
      }
    } catch (err) {
      console.error('[Session DB Error]', err);
    }

    // Generate reply using scripted engine
    const reply = handleScriptedChat(message, locale, pain);

    return streamSSE(c, async (stream) => {
      // Split into words for streaming effect
      const words = reply.text.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        await stream.writeSSE({
          data: JSON.stringify({ type: 'token', content: word }),
        });
      }

      if (reply.tool) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'tool',
            tool: reply.tool.name,
            data: reply.tool.data,
          }),
        });
      }

      await stream.writeSSE({
        data: JSON.stringify({ type: 'done', sessionId: activeSessionId }),
      });
    });
  });

  return router;
}
