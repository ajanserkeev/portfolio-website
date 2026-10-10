import type { BookingPayload, LeadPayload } from './telegram';

export interface CrmSync {
  syncLead(lead: LeadPayload): Promise<boolean>;
  syncBooking(booking: BookingPayload): Promise<boolean>;
}

export class RealCrmSync implements CrmSync {
  private webhookUrl?: string;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl;
  }

  async syncLead(lead: LeadPayload): Promise<boolean> {
    if (!this.webhookUrl) {
      return false;
    }

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lead', ...lead }),
      });
      return res.ok;
    } catch (err) {
      console.error('[CRM Sync Error]', err);
      return false;
    }
  }

  async syncBooking(booking: BookingPayload): Promise<boolean> {
    if (!this.webhookUrl) {
      return false;
    }

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'booking', ...booking }),
      });
      return res.ok;
    } catch (err) {
      console.error('[CRM Sync Booking Error]', err);
      return false;
    }
  }
}

export class FakeCrmSync implements CrmSync {
  public syncedLeads: LeadPayload[] = [];
  public syncedBookings: BookingPayload[] = [];

  async syncLead(lead: LeadPayload): Promise<boolean> {
    this.syncedLeads.push(lead);
    return true;
  }

  async syncBooking(booking: BookingPayload): Promise<boolean> {
    this.syncedBookings.push(booking);
    return true;
  }
}
