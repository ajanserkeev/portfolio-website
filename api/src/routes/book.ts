import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { z } from 'zod';
import type { CrmSync } from '../integrations/crm';
import type { TelegramNotifier } from '../integrations/telegram';

export const bookRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  contact: z.string().trim().min(3, 'Contact is required'),
  channel: z.enum(['telegram', 'whatsapp', 'phone', 'email']).default('telegram'),
  slotStart: z.string().min(1, 'Slot start is required'),
  slotEnd: z.string().min(1, 'Slot end is required'),
  sessionId: z.string().optional(),
  locale: z.enum(['ru', 'en']).default('ru'),
  hp: z.string().optional(),
  startedAt: z.number().optional(),
});

export type BookRequest = z.infer<typeof bookRequestSchema>;

export interface BookRouteOptions {
  db: DatabaseSync;
  telegramNotifier?: TelegramNotifier;
  crmSync?: CrmSync;
}

export function createBookRoute(options: BookRouteOptions) {
  const { db, telegramNotifier, crmSync } = options;
  const router = new Hono();

  router.post('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, 400);
    }

    const parseResult = bookRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return c.json(
        {
          error: issue?.message ?? 'Validation failed',
          code: 'VALIDATION_ERROR',
        },
        400,
      );
    }

    const data = parseResult.data;

    // Honeypot spam check
    if (data.hp && data.hp.trim().length > 0) {
      return c.json({ error: 'Spam detected', code: 'SPAM_DETECTED' }, 400);
    }

    // Bot submission speed check (< 1s)
    if (data.startedAt && Date.now() - data.startedAt < 1000) {
      return c.json({ error: 'Submission too fast', code: 'SPAM_DETECTED' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    try {
      db.prepare(`
        INSERT INTO bookings (id, created_at, slot_start, slot_end, name, contact, channel, session_id, locale, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
      `).run(
        id,
        createdAt,
        data.slotStart,
        data.slotEnd,
        data.name,
        data.contact,
        data.channel,
        data.sessionId ?? null,
        data.locale,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE') || msg.includes('constraint')) {
        return c.json(
          {
            error: 'This slot has already been booked',
            code: 'SLOT_ALREADY_BOOKED',
          },
          409,
        );
      }
      throw err;
    }

    const bookingPayload = {
      id,
      name: data.name,
      contact: data.contact,
      channel: data.channel,
      slotStart: data.slotStart,
      slotEnd: data.slotEnd,
      locale: data.locale,
    };

    if (telegramNotifier) {
      telegramNotifier.notifyBooking(bookingPayload).catch((err) => {
        console.error('[Telegram Booking Notify Error]', err);
      });
    }

    if (crmSync) {
      crmSync.syncBooking(bookingPayload).catch((err) => {
        console.error('[CRM Booking Sync Error]', err);
      });
    }

    return c.json({ ok: true, id, status: 'confirmed' }, 201);
  });

  return router;
}
