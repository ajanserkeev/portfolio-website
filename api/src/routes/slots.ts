import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { type BusyInterval, generateSlots, type SlotRuleOptions } from '../booking/slots';

export interface SlotsRouteOptions {
  db: DatabaseSync;
  rules?: SlotRuleOptions;
  now?: () => Date;
}

/** Intervals already taken by bookings that are not cancelled. */
export function busyIntervals(db: DatabaseSync): BusyInterval[] {
  const rows = db
    .prepare("SELECT slot_start, slot_end FROM bookings WHERE status != 'cancelled'")
    .all() as Array<{ slot_start: string; slot_end: string }>;
  return rows.map((r) => ({ start: r.slot_start, end: r.slot_end }));
}

export function createSlotsRoute(options: SlotsRouteOptions) {
  const { db, rules, now = () => new Date() } = options;
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

    const slots = generateSlots({ ...rules, daysAhead }, busyIntervals(db), now());

    return c.json({
      ok: true,
      slots,
      count: slots.length,
    });
  });

  return router;
}
