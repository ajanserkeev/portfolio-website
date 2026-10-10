import { describe, expect, it } from 'vitest';
import { initDatabase } from '../src/db';

describe('SQLite Database', () => {
  it('initializes in-memory database and creates schema', () => {
    const db = initDatabase(':memory:');
    expect(db).toBeDefined();

    // Verify tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('leads');
    expect(tableNames).toContain('bookings');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('rate_limits');

    db.close();
  });

  it('inserts and retrieves lead record', () => {
    const db = initDatabase(':memory:');
    const id = 'lead-uuid-1';
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO leads (id, created_at, name, contact, channel, message, pain, services, estimate, session_id, locale, ip, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      createdAt,
      'Aman',
      '+77010000000',
      'whatsapp',
      'Need AI triage agent',
      'lost-leads',
      JSON.stringify(['agents']),
      JSON.stringify({ minPrice: 1000, maxPrice: 1500 }),
      'sess-1',
      'ru',
      '127.0.0.1',
      'new',
    );

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as Record<string, unknown>;
    expect(lead).toBeDefined();
    expect(lead.name).toBe('Aman');
    expect(lead.channel).toBe('whatsapp');
    expect(lead.status).toBe('new');

    db.close();
  });

  it('enforces UNIQUE constraint on bookings slot_start', () => {
    const db = initDatabase(':memory:');
    const slotStart = '2026-10-15T10:00:00Z';
    const slotEnd = '2026-10-15T10:30:00Z';

    db.prepare(`
      INSERT INTO bookings (id, created_at, slot_start, slot_end, name, contact, channel, locale)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'book-1',
      new Date().toISOString(),
      slotStart,
      slotEnd,
      'Client 1',
      '+7700',
      'telegram',
      'ru',
    );

    expect(() => {
      db.prepare(`
        INSERT INTO bookings (id, created_at, slot_start, slot_end, name, contact, channel, locale)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'book-2',
        new Date().toISOString(),
        slotStart,
        slotEnd,
        'Client 2',
        '+7701',
        'telegram',
        'ru',
      );
    }).toThrow();

    db.close();
  });
});
