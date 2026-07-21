// Scheduled retry for failed CRM syncs — every 15 minutes (SPEC.md §8).
// Leads are always safe in Supabase; this drains crm_status='failed'.
import type { Config, Context } from '@netlify/functions';
import { supabase } from './lib/supabase';
import { syncLeadToCrm } from './lib/sync-crm';
import type { LeadRow, RepRow } from './lib/types';

export default async function handler(_req: Request, _context: Context): Promise<Response> {
  const db = supabase();
  const { data: failed, error } = await db
    .from('leads')
    .select('*')
    .eq('crm_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(25);

  if (error) {
    console.error('crm-retry query failed:', error);
    return new Response('query failed', { status: 500 });
  }

  let retried = 0;
  for (const lead of (failed ?? []) as LeadRow[]) {
    let rep: RepRow | null = null;
    if (lead.assigned_rep_id) {
      const { data } = await db.from('reps').select('*').eq('id', lead.assigned_rep_id).maybeSingle();
      rep = (data as RepRow | null) ?? null;
    }
    await syncLeadToCrm(lead, rep);
    retried += 1;
  }

  return Response.json({ retried });
}

export const config: Config = {
  schedule: '*/15 * * * *',
};
