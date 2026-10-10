import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { z } from 'zod';
import type { CrmSync } from '../integrations/crm';
import type { TelegramNotifier } from '../integrations/telegram';

export const leadRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  contact: z.string().trim().min(3, 'Contact is required'),
  channel: z.enum(['telegram', 'whatsapp', 'phone', 'email']).default('telegram'),
  message: z.string().trim().optional(),
  pain: z.string().trim().optional(),
  services: z.array(z.string()).optional(),
  estimate: z.record(z.string(), z.unknown()).optional(),
  consent: z.literal(true),
  locale: z.enum(['ru', 'en']).default('ru'),
  sessionId: z.string().optional(),
  hp: z.string().optional(),
  startedAt: z.number().optional(),
});

export type LeadRequest = z.infer<typeof leadRequestSchema>;

export interface LeadRouteOptions {
  db: DatabaseSync;
  telegramNotifier?: TelegramNotifier;
  crmSync?: CrmSync;
}

export function createLeadRoute(options: LeadRouteOptions) {
  const { db, telegramNotifier, crmSync } = options;
  const router = new Hono();

  router.post('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, 400);
    }

    const parseResult = leadRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const isConsent = issue?.path.includes('consent');
      return c.json(
        {
          error: issue?.message ?? 'Validation failed',
          code: isConsent ? 'CONSENT_REQUIRED' : 'VALIDATION_ERROR',
        },
        400,
      );
    }

    const data = parseResult.data;

    // Spam protection: honeypot check
    if (data.hp && data.hp.trim().length > 0) {
      return c.json({ error: 'Spam detected', code: 'SPAM_DETECTED' }, 400);
    }

    // Spam protection: too fast submission (< 1.5s)
    if (data.startedAt && Date.now() - data.startedAt < 1500) {
      return c.json({ error: 'Submission too fast', code: 'SPAM_DETECTED' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      '127.0.0.1';

    db.prepare(`
      INSERT INTO leads (id, created_at, name, contact, channel, message, pain, services, estimate, session_id, locale, ip, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      createdAt,
      data.name,
      data.contact,
      data.channel,
      data.message ?? null,
      data.pain ?? null,
      data.services ? JSON.stringify(data.services) : null,
      data.estimate ? JSON.stringify(data.estimate) : null,
      data.sessionId ?? null,
      data.locale,
      ip,
      'new',
    );

    // Notify Telegram and sync CRM asynchronously
    const payload = {
      id,
      name: data.name,
      contact: data.contact,
      channel: data.channel,
      message: data.message,
      pain: data.pain,
      services: data.services,
      locale: data.locale,
    };

    if (telegramNotifier) {
      telegramNotifier.notifyLead(payload).catch((err) => {
        console.error('[Telegram Notify Failed]', err);
      });
    }

    if (crmSync) {
      crmSync.syncLead(payload).catch((err) => {
        console.error('[CRM Sync Failed]', err);
      });
    }

    return c.json({ ok: true, id }, 201);
  });

  return router;
}
