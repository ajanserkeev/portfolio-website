export interface LeadPayload {
  id: string;
  name: string;
  contact: string;
  channel: string;
  message?: string;
  pain?: string;
  services?: string[];
  locale: string;
}

export interface BookingPayload {
  id: string;
  name: string;
  contact: string;
  channel: string;
  slotStart: string;
  slotEnd: string;
  locale: string;
}

export interface TelegramNotifier {
  notifyLead(lead: LeadPayload): Promise<boolean>;
  notifyBooking(booking: BookingPayload): Promise<boolean>;
}

export class RealTelegramNotifier implements TelegramNotifier {
  private token?: string;
  private chatId?: string;

  constructor(token?: string, chatId?: string) {
    this.token = token;
    this.chatId = chatId;
  }

  async notifyLead(lead: LeadPayload): Promise<boolean> {
    if (!this.token || !this.chatId) {
      return false;
    }

    const text = [
      '<b>Башня — Новая заявка</b>',
      `<b>Имя:</b> ${escapeHtml(lead.name)}`,
      `<b>Контакт:</b> ${escapeHtml(lead.contact)} (${escapeHtml(lead.channel)})`,
      lead.pain ? `<b>Боль:</b> ${escapeHtml(lead.pain)}` : null,
      lead.services && lead.services.length > 0
        ? `<b>Услуги:</b> ${escapeHtml(lead.services.join(', '))}`
        : null,
      lead.message ? `<b>Сообщение:</b> ${escapeHtml(lead.message)}` : null,
      `<b>Язык:</b> ${escapeHtml(lead.locale)}`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendMessage(text);
  }

  async notifyBooking(booking: BookingPayload): Promise<boolean> {
    if (!this.token || !this.chatId) {
      return false;
    }

    const text = [
      '<b>Башня — Бронирование звонка</b>',
      `<b>Имя:</b> ${escapeHtml(booking.name)}`,
      `<b>Контакт:</b> ${escapeHtml(booking.contact)} (${escapeHtml(booking.channel)})`,
      `<b>Начало:</b> ${escapeHtml(booking.slotStart)}`,
      `<b>Конец:</b> ${escapeHtml(booking.slotEnd)}`,
      `<b>Язык:</b> ${escapeHtml(booking.locale)}`,
    ].join('\n');

    return this.sendMessage(text);
  }

  private async sendMessage(text: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
        }),
      });
      return res.ok;
    } catch (err) {
      console.error('[Telegram Notify Error]', err);
      return false;
    }
  }
}

export class FakeTelegramNotifier implements TelegramNotifier {
  public sentLeads: LeadPayload[] = [];
  public sentBookings: BookingPayload[] = [];

  async notifyLead(lead: LeadPayload): Promise<boolean> {
    this.sentLeads.push(lead);
    return true;
  }

  async notifyBooking(booking: BookingPayload): Promise<boolean> {
    this.sentBookings.push(booking);
    return true;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
