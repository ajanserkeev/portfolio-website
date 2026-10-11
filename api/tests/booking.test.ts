import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { type BusyInterval, generateSlots, type SlotRuleOptions } from '../src/booking/slots';
import { loadConfig } from '../src/config';
import { initDatabase } from '../src/db';
import { FakeCrmSync } from '../src/integrations/crm';
import { FakeTelegramNotifier } from '../src/integrations/telegram';

describe('generateSlots()', () => {
  const rules: SlotRuleOptions = {
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri
    startHour: 10,
    endHour: 18,
    slotDurationMinutes: 30,
    daysAhead: 3,
    minNoticeMinutes: 120, // 2 hours
    timeZone: 'Asia/Almaty',
  };

  it('generates slots only during working hours on working days', () => {
    // 2026-10-12 is Monday. 00:00 UTC = 05:00 in Asia/Almaty.
    // 04:00 UTC = 09:00 in Asia/Almaty.
    const now = new Date('2026-10-12T04:00:00.000Z');
    const slots = generateSlots(rules, [], now);

    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      const [h, m] = slot.time.split(':').map((s) => Number.parseInt(s, 10));
      expect(h).toBeDefined();
      expect(m).toBeDefined();
      if (h !== undefined) {
        expect(h).toBeGreaterThanOrEqual(10);
        expect(h).toBeLessThan(18);
      }
      expect([0, 30]).toContain(m);
    }
  });

  it('filters out slots within minNoticeMinutes', () => {
    // Monday 2026-10-12 at 10:15 in Almaty (05:15 UTC)
    // minNotice is 120 mins (2h), so earliest available slot must be >= 12:15 Almaty
    const now = new Date('2026-10-12T05:15:00.000Z');
    const slots = generateSlots(rules, [], now);

    const mondaySlots = slots.filter((s) => s.date === '2026-10-12');
    expect(mondaySlots.length).toBeGreaterThan(0);

    const firstMondaySlot = mondaySlots[0];
    expect(firstMondaySlot).toBeDefined();
    // Earliest 30m slot after 12:15 is 12:30
    expect(firstMondaySlot?.time).toBe('12:30');
  });

  it('filters out busy/booked intervals', () => {
    const now = new Date('2026-10-12T00:00:00.000Z');
    // Almaty is UTC+5. 10:00 Almaty = 05:00 UTC.
    // Busy slot from 10:00 to 10:30 Almaty (05:00 to 05:30 UTC)
    const busy: BusyInterval[] = [
      {
        start: '2026-10-12T05:00:00.000Z',
        end: '2026-10-12T05:30:00.000Z',
      },
      {
        start: '2026-10-12T06:00:00.000Z',
        end: '2026-10-12T06:30:00.000Z',
      },
    ];

    const slots = generateSlots(rules, busy, now);
    const mondaySlots = slots.filter((s) => s.date === '2026-10-12');

    const times = mondaySlots.map((s) => s.time);
    expect(times).not.toContain('10:00');
    expect(times).toContain('10:30');
    expect(times).not.toContain('11:00'); // 06:00 UTC is 11:00 Almaty
    expect(times).toContain('11:30');
  });

  it('skips weekends', () => {
    // 2026-10-16 is Friday, next days are Saturday (17) and Sunday (18)
    const now = new Date('2026-10-16T00:00:00.000Z');
    const customRules = { ...rules, daysAhead: 4 }; // Fri, Sat, Sun, Mon
    const slots = generateSlots(customRules, [], now);

    const dates = new Set(slots.map((s) => s.date));
    expect(dates.has('2026-10-16')).toBe(true); // Friday
    expect(dates.has('2026-10-17')).toBe(false); // Saturday
    expect(dates.has('2026-10-18')).toBe(false); // Sunday
    expect(dates.has('2026-10-19')).toBe(true); // Monday
  });
});

describe('Booking API endpoints', () => {
  function setupTestApp() {
    const config = loadConfig({ NODE_ENV: 'test', SQLITE_PATH: ':memory:' });
    const db = initDatabase(':memory:');
    const telegramNotifier = new FakeTelegramNotifier();
    const crmSync = new FakeCrmSync();
    const now = () => new Date('2026-10-12T00:00:00.000Z');
    const app = createApp({ config, db, telegramNotifier, crmSync, now });

    return { app, db, telegramNotifier, crmSync };
  }

  it('GET /api/slots returns available slots list', async () => {
    const { app, db } = setupTestApp();

    const res = await app.request('/api/slots?days=3');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.slots)).toBe(true);
    expect(data.count).toBe(data.slots.length);

    db.close();
  });

  it('POST /api/book successfully reserves a slot and notifies integrations', async () => {
    const { app, db, telegramNotifier, crmSync } = setupTestApp();

    const payload = {
      name: 'Aman',
      contact: '+7 701 999 8877',
      channel: 'telegram',
      slotStart: '2026-10-15T06:00:00.000Z',
      slotEnd: '2026-10-15T06:30:00.000Z',
      locale: 'ru',
      consent: true,
      startedAt: Date.now() - 3000,
    };

    const res = await app.request('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();
    expect(body.status).toBe('confirmed');

    // Verify stored in DB
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(body.id) as Record<
      string,
      unknown
    >;
    expect(booking).toBeDefined();
    expect(booking.slot_start).toBe('2026-10-15T06:00:00.000Z');

    // Verify notifications
    expect(telegramNotifier.sentBookings).toHaveLength(1);
    expect(telegramNotifier.sentBookings[0]?.name).toBe('Aman');
    expect(crmSync.syncedBookings).toHaveLength(1);
    expect(crmSync.syncedBookings[0]?.contact).toBe('+7 701 999 8877');

    db.close();
  });

  it('POST /api/book prevents double booking and returns 409 Conflict', async () => {
    const { app, db } = setupTestApp();

    const payload = {
      name: 'User 1',
      contact: 'user1@example.com',
      channel: 'email',
      slotStart: '2026-10-15T07:00:00.000Z',
      slotEnd: '2026-10-15T07:30:00.000Z',
      consent: true,
      startedAt: Date.now() - 2000,
    };

    // First booking succeeds
    const res1 = await app.request('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(201);

    // Second booking with the exact same slot conflicts
    const res2 = await app.request('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        name: 'User 2',
        contact: 'user2@example.com',
      }),
    });

    expect(res2.status).toBe(409);
    const body = await res2.json();
    expect(body.code).toBe('SLOT_ALREADY_BOOKED');

    db.close();
  });

  it('POST /api/book detects honeypot and fast bot', async () => {
    const { app, db } = setupTestApp();

    // Honeypot detection
    const hpRes = await app.request('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bot',
        contact: 'bot@spam.com',
        slotStart: '2026-10-15T08:00:00.000Z',
        slotEnd: '2026-10-15T08:30:00.000Z',
        consent: true,
        hp: 'trap value',
      }),
    });
    expect(hpRes.status).toBe(400);
    const hpBody = await hpRes.json();
    expect(hpBody.code).toBe('SPAM_DETECTED');

    // Fast bot detection
    const fastRes = await app.request('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fast Bot',
        contact: 'fast@spam.com',
        slotStart: '2026-10-15T08:00:00.000Z',
        slotEnd: '2026-10-15T08:30:00.000Z',
        consent: true,
        startedAt: Date.now() - 100,
      }),
    });
    expect(fastRes.status).toBe(400);
    const fastBody = await fastRes.json();
    expect(fastBody.code).toBe('SPAM_DETECTED');

    db.close();
  });

  function book(app: ReturnType<typeof setupTestApp>['app'], body: Record<string, unknown>) {
    return app.request('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aman',
        contact: '@aman',
        channel: 'telegram',
        startedAt: Date.now() - 3000,
        ...body,
      }),
    });
  }

  it('POST /api/book requires consent to personal data processing', async () => {
    const { app, db } = setupTestApp();
    const res = await book(app, { slotStart: '2026-10-15T06:00:00.000Z' });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('CONSENT_REQUIRED');
    db.close();
  });

  it('POST /api/book only accepts a slot that /api/slots would offer', async () => {
    const { app, db } = setupTestApp();
    // 03:00 Almaty is outside working hours; garbage is not a slot at all.
    for (const slotStart of ['2026-10-14T22:00:00.000Z', 'tomorrow']) {
      const res = await book(app, { slotStart, consent: true });
      expect(res.status, slotStart).toBe(409);
      expect((await res.json()).code).toBe('SLOT_UNAVAILABLE');
    }
    db.close();
  });

  it('POST /api/book stores the server-side end of the slot', async () => {
    const { app, db } = setupTestApp();
    const res = await book(app, {
      slotStart: '2026-10-15T06:00:00.000Z',
      slotEnd: '2026-10-15T09:00:00.000Z',
      consent: true,
    });
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const row = db.prepare('SELECT slot_end FROM bookings WHERE id = ?').get(id) as {
      slot_end: string;
    };
    expect(row.slot_end).toBe('2026-10-15T06:30:00.000Z');
    db.close();
  });
});
