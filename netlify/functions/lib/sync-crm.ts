// CRM sync step (SPEC.md §8). The lead is ALREADY persisted in Supabase
// before this runs — a throw here can never lose a lead. On failure:
// crm_status='failed' (picked up by the 15-min retry function) + one-time
// admin SMS alert.
import { supabase } from './supabase';
import { crmAdapter, SkipCrmSync } from './crm';
import { alertAdmin } from './notify';
import type { LeadRow, RepRow } from './types';

export async function syncLeadToCrm(lead: LeadRow, rep: RepRow | null): Promise<void> {
  const db = supabase();
  try {
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
  } catch (err) {
    if (err instanceof SkipCrmSync) {
      // No CRM configured yet — leave crm_status='pending'; nothing to retry.
      return;
    }
    const { data: current } = await db.from('leads').select('raw').eq('id', lead.id).maybeSingle();
    const raw = { ...((current?.raw as Record<string, unknown>) ?? {}) };
    raw.crm_attempts = ((raw.crm_attempts as number) ?? 0) + 1;
    raw.crm_last_error = err instanceof Error ? err.message : String(err);
    await db.from('leads').update({ crm_status: 'failed', raw }).eq('id', lead.id);

    if (!raw.admin_alerted) {
      try {
        await alertAdmin(
          `HardRok: CRM sync failed for lead ${lead.id} (${lead.phone}). It is safe in Supabase and will retry every 15 min.`,
        );
        raw.admin_alerted = true;
        await db.from('leads').update({ raw }).eq('id', lead.id);
      } catch {
        /* alerting must never break the pipeline */
      }
    }
  }
}
