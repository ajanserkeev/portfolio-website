import type { LeadPayload } from './telegram';

export interface CrmSync {
  syncLead(lead: LeadPayload): Promise<boolean>;
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
        body: JSON.stringify(lead),
      });
      return res.ok;
    } catch (err) {
      console.error('[CRM Sync Error]', err);
      return false;
    }
  }
}

export class FakeCrmSync implements CrmSync {
  public syncedLeads: LeadPayload[] = [];

  async syncLead(lead: LeadPayload): Promise<boolean> {
    this.syncedLeads.push(lead);
    return true;
  }
}
