// Web-lead alert (SPEC.md §9.2): every lead fires an SMS to the assigned rep.
import { sendSms } from './twilio';
import type { LeadRow, RepRow } from './types';

export async function alertRep(lead: LeadRow, rep: RepRow | null): Promise<void> {
  if (!rep?.phone) return;
  const msg = (lead.message ?? '').slice(0, 120);
  // TODO: point at the CRM record URL once the CRM vendor is known; until
  // then, link the Supabase table dashboard so reps can open the lead.
  const projectRef = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const recordLink = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/editor/leads`
    : '';
  const body =
    `New HardRok lead: ${lead.name ?? 'Unknown'}, ${lead.phone}` +
    ` | ${lead.category ?? 'n/a'} | ${lead.state ?? 'n/a'}` +
    (msg ? ` | "${msg}"` : '') +
    ` | lead id ${lead.id}` +
    (recordLink ? ` ${recordLink}` : '');
  await sendSms(rep.phone, body);
}

export async function alertAdmin(message: string): Promise<void> {
  const admin = process.env.ADMIN_PHONE;
  if (!admin) return;
  await sendSms(admin, message);
}
