// Downstream delivery (SPEC.md §8). The lead is ALREADY persisted in Supabase
// before this runs — a throw here can never lose a lead.
//
// Master switch CRM_ENABLED:
//   true  -> CRM adapter flow (CRM_PROVIDER; webhook default) -> crm_status='synced'
//   false -> email adapter: lead lands in LEAD_EMAIL_TO's inbox, GoDaddy-form
//            style -> crm_status='email_sent'
// Either mode, on failure: crm_status='failed' (drained by the 15-min retry
// function) + one-time admin SMS. The rep SMS alert (§9.2) is independent of
// this step and fires in both modes.
import { supabase } from './supabase';
import { crmAdapter } from './crm';
import { sendLeadEmail } from './email';
import { alertAdmin } from './notify';
import type { LeadRow, RepRow } from './types';

export function crmEnabled(): boolean {
  return (process.env.CRM_ENABLED ?? 'false').toLowerCase() === 'true';
}

function leadEmailContent(lead: LeadRow, rep: RepRow | null) {
  const rows: [string, string | null | undefined][] = [
    ['Name', lead.name],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Company', lead.company],
    ['State', lead.state],
    ['Category', lead.category],
    ['Machine', lead.machine],
    ['Part number', lead.part_number],
    ['Message', lead.message],
    ['Photo', lead.attachment_url],
    ['Source', `${lead.source}${lead.source_page ? ` (${lead.source_page})` : ''}`],
    ['Assigned rep', rep ? `${rep.name ?? rep.slug}` : 'unassigned'],
    ['Lead ID', lead.id],
    ['Received', lead.created_at],
  ];
  const present = rows.filter(([, v]) => v);
  const subject = `New HardRok lead: ${lead.name ?? lead.phone}${lead.category ? ` — ${lead.category}` : ''}${lead.state ? ` (${lead.state})` : ''}`;
  const text = present.map(([k, v]) => `${k}: ${v}`).join('\n');
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<h2 style="font-family:sans-serif">New website lead</h2><table style="font-family:sans-serif;border-collapse:collapse">${present
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${
          k === 'Photo' ? `<a href="${esc(String(v))}">view photo</a>` : esc(String(v))
        }</td></tr>`,
    )
    .join('')}</table>`;
  return { subject, text, html };
}

async function markFailed(leadId: string, phone: string, err: unknown): Promise<void> {
  const db = supabase();
  const { data: current } = await db.from('leads').select('raw').eq('id', leadId).maybeSingle();
  const raw = { ...((current?.raw as Record<string, unknown>) ?? {}) };
  raw.delivery_attempts = ((raw.delivery_attempts as number) ?? 0) + 1;
  raw.delivery_last_error = err instanceof Error ? err.message : String(err);
  await db.from('leads').update({ crm_status: 'failed', raw }).eq('id', leadId);

  if (!raw.admin_alerted) {
    try {
      await alertAdmin(
        `HardRok: lead delivery failed for ${leadId} (${phone}). It is safe in Supabase and will retry every 15 min.`,
      );
      raw.admin_alerted = true;
      await db.from('leads').update({ raw }).eq('id', leadId);
    } catch {
      /* alerting must never break the pipeline */
    }
  }
}

export async function deliverLead(lead: LeadRow, rep: RepRow | null): Promise<void> {
  const db = supabase();
  try {
    if (crmEnabled()) {
      const adapter = crmAdapter();
      const { externalId } = await adapter.createLead(lead);
      if (externalId && rep?.slug) {
        await adapter.assignOwner(externalId, {
          repSlug: rep.slug,
          repEmail: rep.email ?? undefined,
        });
      }
      await db
        .from('leads')
        .update({ crm_status: 'synced', crm_external_id: externalId })
        .eq('id', lead.id);
    } else {
      await sendLeadEmail(leadEmailContent(lead, rep));
      await db.from('leads').update({ crm_status: 'email_sent' }).eq('id', lead.id);
    }
  } catch (err) {
    await markFailed(lead.id, lead.phone, err);
  }
}
