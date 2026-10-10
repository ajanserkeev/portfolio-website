import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { initDatabase } from '../src/db';
import { FakeCrmSync } from '../src/integrations/crm';
import { FakeTelegramNotifier } from '../src/integrations/telegram';

describe('POST /api/lead', () => {
  function setupTestApp() {
    const config = loadConfig({ NODE_ENV: 'test', SQLITE_PATH: ':memory:' });
    const db = initDatabase(':memory:');
    const telegramNotifier = new FakeTelegramNotifier();
    const crmSync = new FakeCrmSync();
    const app = createApp({ config, db, telegramNotifier, crmSync });

    return { app, db, telegramNotifier, crmSync };
  }

  it('successfully creates lead and notifies Telegram & CRM', async () => {
    const { app, db, telegramNotifier, crmSync } = setupTestApp();

    const payload = {
      name: 'Aman',
      contact: '+7 701 123 4567',
      channel: 'whatsapp',
      message: 'Need an AI receptionist for clinic',
      pain: 'lost-leads',
      services: ['agents'],
      consent: true,
      locale: 'ru',
      startedAt: Date.now() - 5000,
    };

    const res = await app.request('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();

    // Verify stored in DB
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(body.id) as Record<
      string,
      unknown
    >;
    expect(lead).toBeDefined();
    expect(lead.name).toBe('Aman');
    expect(lead.contact).toBe('+7 701 123 4567');
    expect(lead.channel).toBe('whatsapp');

    // Verify Telegram & CRM received lead
    expect(telegramNotifier.sentLeads).toHaveLength(1);
    expect(telegramNotifier.sentLeads[0]?.name).toBe('Aman');
    expect(crmSync.syncedLeads).toHaveLength(1);
    expect(crmSync.syncedLeads[0]?.contact).toBe('+7 701 123 4567');

    db.close();
  });

  it('rejects submission without consent', async () => {
    const { app, db } = setupTestApp();

    const res = await app.request('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex',
        contact: 'alex@example.com',
        channel: 'email',
        consent: false,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('CONSENT_REQUIRED');

    db.close();
  });

  it('detects honeypot spam submission', async () => {
    const { app, db, telegramNotifier } = setupTestApp();

    const res = await app.request('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Spam Bot',
        contact: 'bot@spam.com',
        consent: true,
        hp: 'I am a hidden bot input',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('SPAM_DETECTED');
    expect(telegramNotifier.sentLeads).toHaveLength(0);

    db.close();
  });

  it('detects unnaturally fast bot submission', async () => {
    const { app, db } = setupTestApp();

    const res = await app.request('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fast Bot',
        contact: 'fast@bot.com',
        consent: true,
        startedAt: Date.now() - 200, // filled in 200ms
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('SPAM_DETECTED');

    db.close();
  });
});
