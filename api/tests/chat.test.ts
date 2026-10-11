import { describe, expect, it } from 'vitest';
import { handleScriptedChat } from '../src/agent/scripted';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { initDatabase } from '../src/db';

describe('Scripted Chat Agent', () => {
  it('replies to greetings in Russian and English', () => {
    const ruReply = handleScriptedChat('Привет! Кто вы?', 'ru');
    expect(ruReply.text.length).toBeGreaterThan(20);
    expect(ruReply.text).toContain('Башн');

    const enReply = handleScriptedChat('Hello, what is Tower?', 'en');
    expect(enReply.text.length).toBeGreaterThan(20);
    expect(enReply.text).toContain('Tower');
  });

  it('detects booking intent and suggests get_free_slots tool', () => {
    const reply = handleScriptedChat('Хочу записаться на созвон с командой', 'ru');
    expect(reply.tool).toBeDefined();
    expect(reply.tool?.name).toBe('get_free_slots');
  });

  it('detects pricing intent and refers to calculator/estimate', () => {
    const reply = handleScriptedChat('Какая стоимость разработки бота?', 'ru');
    expect(reply.text).toMatch(/стоимост|вилка|калькулятор/i);
  });

  it('detects portfolio/cases intent and suggests show_case tool', () => {
    const reply = handleScriptedChat('Покажи примеры кейсов', 'ru');
    expect(reply.tool?.name).toBe('show_case');
  });
});

describe('POST /api/chat SSE endpoint', () => {
  it('streams response chunks via Server-Sent Events', async () => {
    const config = loadConfig({ NODE_ENV: 'test', SQLITE_PATH: ':memory:' });
    const db = initDatabase(':memory:');
    const app = createApp({ config, db });

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Привет!',
        locale: 'ru',
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const rawStream = await res.text();
    expect(rawStream).toContain('data:');
    expect(rawStream).toContain('"type":"token"');
    expect(rawStream).toContain('"type":"done"');

    db.close();
  });
});
