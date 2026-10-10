import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { generateSlots, type SlotRuleOptions } from '../booking/slots';

export interface SlotsRouteOptions {
  db: DatabaseSync;
  rules?: SlotRuleOptions;
}

export function createSlotsRoute(options: SlotsRouteOptions) {
  const { db, rules } = options;
  const router = new Hono();

  router.get('/', (c) => {
    const rawDays = c.req.query('days');
    let daysAhead = 7;
    if (rawDays) {
      const parsed = Number.parseInt(rawDays, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 30) {
        daysAhead = parsed;
      }
    }

    const rows = db
      .prepare("SELECT slot_start, slot_end FROM bookings WHERE status != 'cancelled'")
      .all() as Array<{ slot_start: string; slot_end: string }>;

    const busy = rows.map((r) => ({
      start: r.slot_start,
      end: r.slot_end,
    }));

    const slots = generateSlots(
      {
        ...rules,
        daysAhead,
      },
      busy,
      new Date(),
    );

    return c.json({
      ok: true,
      slots,
      count: slots.length,
    });
  });

  return router;
}
