// Generic webhook adapter — the COMPLETE, working default (SPEC.md §8).
// POSTs the normalized lead JSON to CRM_WEBHOOK_URL (e.g. Zapier/Make or the
// CRM's inbound webhook).
import type { LeadRow } from '../types';
import type { CrmAdapter } from './types';

async function post(payload: Record<string, unknown>): Promise<Response> {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) {
    // CRM mode is an explicit opt-in (CRM_ENABLED=true); a missing URL there
    // is a misconfiguration -> fail, retry, and alert the admin. Pre-CRM,
    // leave CRM_ENABLED=false and leads are emailed instead.
    throw new Error('CRM_WEBHOOK_URL must be set when CRM_ENABLED=true and CRM_PROVIDER=webhook');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`CRM webhook responded ${res.status}`);
  return res;
}

export const webhookAdapter: CrmAdapter = {
  async createLead(lead: LeadRow) {
    const res = await post({
      event: 'lead.created',
      lead: {
        id: lead.id,
        created_at: lead.created_at,
        source: lead.source,
        source_page: lead.source_page,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        company: lead.company,
        state: lead.state,
        category: lead.category,
        machine: lead.machine,
        message: lead.message,
        attachment_url: lead.attachment_url,
        assigned_rep_id: lead.assigned_rep_id,
        territory_id: lead.territory_id,
      },
    });
    // If the receiver echoes an id back, keep it; otherwise use our own.
    let externalId: string | null = lead.id;
    try {
      const body = (await res.json()) as { id?: string };
      if (body?.id) externalId = body.id;
    } catch {
      /* non-JSON response is fine */
    }
    return { externalId };
  },

  async assignOwner(externalId, repMap) {
    await post({ event: 'lead.assign_owner', external_id: externalId, ...repMap });
  },

  async addNote(externalId, note) {
    await post({ event: 'lead.note', external_id: externalId, note });
  },
};
