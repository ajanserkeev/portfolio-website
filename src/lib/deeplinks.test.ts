import { describe, expect, it } from 'vitest';
import { createTelegramDeepLink, createWhatsAppDeepLink } from './deeplinks';

describe('Deep links generator', () => {
  it('creates clean Telegram link without payload', () => {
    expect(createTelegramDeepLink('@tower_studio_bot')).toBe('https://t.me/tower_studio_bot');
    expect(createTelegramDeepLink('tower_studio_bot')).toBe('https://t.me/tower_studio_bot');
  });

  it('creates Telegram link with sanitized start payload', () => {
    const link = createTelegramDeepLink('tower_studio_bot', 'pain_lost-leads');
    expect(link).toBe('https://t.me/tower_studio_bot?start=pain_lost-leads');
  });

  it('creates clean WhatsApp link without message', () => {
    expect(createWhatsAppDeepLink('+7 (701) 123-45-67')).toBe('https://wa.me/77011234567');
  });

  it('creates WhatsApp link with prefilled text', () => {
    const link = createWhatsAppDeepLink('+7 701 123 4567', 'Здравствуйте! Хочу обсудить проект.');
    expect(link).toContain('https://wa.me/77011234567?text=');
    expect(link).toContain(encodeURIComponent('Здравствуйте! Хочу обсудить проект.'));
  });
});
