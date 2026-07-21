// Form handler for every LeadForm on the site. Pipeline (SPEC.md §8):
// parse -> Supabase insert (NEVER lose a lead) -> assign-lead (§7) ->
// deliver (CRM adapter when CRM_ENABLED=true, else email to LEAD_EMAIL_TO) ->
// rep SMS alert (§9.2, fires in both modes).
// Works with JS disabled: plain form POST in, 303 redirect to /thanks/ out.
import type { Context } from '@netlify/functions';
import { supabase, uploadAttachment } from './lib/supabase';
import { assignLead } from './lib/assign-lead';
import { deliverLead } from './lib/deliver-lead';
import { alertRep } from './lib/notify';
import type { LeadRow, LeadSource } from './lib/types';

const SOURCES: LeadSource[] = ['quote_form', 'product_form', 'landing_page'];

const text = (form: FormData, key: string): string | null => {
  const v = form.get(key);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};

export default async function handler(req: Request, _context: Context): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let form: FormData;
  try {
    form = await req.formData(); // handles urlencoded AND multipart
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const wantsHtml = (req.headers.get('accept') ?? '').includes('text/html');
  const redirect = () =>
    Response.redirect(new URL('/thanks/', process.env.URL ?? 'https://www.hardrok.com'), 303);

  // Honeypot: bots fill it; humans never see it. Pretend success.
  if (text(form, 'company_website')) {
    return wantsHtml ? redirect() : Response.json({ ok: true });
  }

  const phone = text(form, 'phone');
  if (!phone) {
    return new Response('Phone is required', { status: 422 });
  }

  const sourceRaw = text(form, 'source');
  const source: LeadSource = SOURCES.includes(sourceRaw as LeadSource)
    ? (sourceRaw as LeadSource)
    : 'quote_form';

  // Attachment upload is best-effort: a failed upload must not cost the lead.
  let attachmentUrl: string | null = null;
  const file = form.get('attachment');
  if (file instanceof File && file.size > 0) {
    try {
      const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80);
      attachmentUrl = await uploadAttachment(
        `web/${crypto.randomUUID()}-${safeName}`,
        await file.arrayBuffer(),
        file.type || 'application/octet-stream',
      );
    } catch (err) {
      console.error('attachment upload failed (continuing without it):', err);
    }
  }

  // 1. Persist to Supabase FIRST. If this fails, surface an error so the
  //    visitor calls instead — never silently drop a lead.
  const db = supabase();
  const { data: lead, error } = await db
    .from('leads')
    .insert({
      source,
      source_page: text(form, 'source_page'),
      name: text(form, 'name'),
      phone,
      email: text(form, 'email'),
      company: text(form, 'company'),
      state: text(form, 'state')?.toUpperCase() ?? null,
      category: text(form, 'category'),
      machine: text(form, 'machine'),
      message: text(form, 'message'),
      attachment_url: attachmentUrl,
      raw: { user_agent: req.headers.get('user-agent') },
    })
    .select('*')
    .single();

  if (error || !lead) {
    console.error('lead insert failed:', error);
    return new Response(
      'We could not save your request. Please call (866) 427-3765 and we will take it by phone.',
      { status: 500 },
    );
  }

  // 2–4. Assignment, CRM, rep alert: each guarded — the lead is already safe.
  let assignedRep = null;
  try {
    const result = await assignLead(lead as LeadRow);
    assignedRep = result.rep;
  } catch (err) {
    console.error('assign-lead failed (lead persisted):', err);
  }

  try {
    const { data: fresh } = await db.from('leads').select('*').eq('id', lead.id).single();
    await deliverLead((fresh ?? lead) as LeadRow, assignedRep);
  } catch (err) {
    console.error('lead delivery step failed (lead persisted):', err);
  }

  try {
    await alertRep(lead as LeadRow, assignedRep);
  } catch (err) {
    console.error('rep alert failed (lead persisted):', err);
  }

  return wantsHtml ? redirect() : Response.json({ ok: true, id: lead.id });
}
