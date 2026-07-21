// Inbound SMS webhook (SPEC.md §9.1). Point the Twilio number's "A message
// comes in" webhook at /.netlify/functions/sms-inbound.
// Pipeline: validate signature -> create lead (source='sms') -> save MMS media
// to Supabase Storage -> route by area-code state -> forward summary to rep ->
// CRM sync -> TwiML auto-reply.
import type { Context } from '@netlify/functions';
import { supabase, uploadAttachment } from './lib/supabase';
import { assignLead } from './lib/assign-lead';
import { deliverLead } from './lib/deliver-lead';
import { alertRep } from './lib/notify';
import { stateFromPhone } from './lib/area-codes';
import { fetchTwilioMedia, twimlMessage, validateTwilioSignature } from './lib/twilio';
import type { LeadRow } from './lib/types';

const AUTO_REPLY =
  "Thanks — you've reached HardRok Equipment. A parts specialist will text you back shortly. " +
  'Reply with a photo of the part + your machine model to speed things up.';

export default async function handler(req: Request, _context: Context): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const bodyText = await req.text();
  const params = Object.fromEntries(new URLSearchParams(bodyText));

  if (!validateTwilioSignature(req.url, params, req.headers.get('x-twilio-signature'))) {
    return new Response('Invalid signature', { status: 403 });
  }

  const from = params.From;
  if (!from) return new Response('Missing From', { status: 400 });

  // Save MMS media first (best-effort) so the URL lands on the lead row.
  let attachmentUrl: string | null = null;
  const numMedia = Number(params.NumMedia ?? '0');
  if (numMedia > 0 && params.MediaUrl0) {
    try {
      const ext = (params.MediaContentType0 ?? 'image/jpeg').split('/')[1] ?? 'jpg';
      attachmentUrl = await uploadAttachment(
        `sms/${crypto.randomUUID()}.${ext}`,
        await fetchTwilioMedia(params.MediaUrl0),
        params.MediaContentType0 ?? 'image/jpeg',
      );
    } catch (err) {
      console.error('MMS media save failed (continuing):', err);
    }
  }

  // 1. Persist the lead FIRST (never lose a lead). Even if everything after
  //    this fails, still auto-reply so the customer isn't left hanging.
  let db;
  try {
    db = supabase();
  } catch (err) {
    console.error('supabase client init failed (check SUPABASE_URL / secret key):', err);
    return twimlMessage(AUTO_REPLY);
  }
  const state = stateFromPhone(from);
  const { data: lead, error } = await db
    .from('leads')
    .insert({
      source: 'sms',
      source_page: null,
      phone: from,
      state,
      message: params.Body ?? null,
      attachment_url: attachmentUrl,
      raw: {
        twilio: {
          message_sid: params.MessageSid ?? null,
          to: params.To ?? null,
          num_media: numMedia,
        },
        state_from_area_code: state,
      },
    })
    .select('*')
    .single();

  if (error || !lead) {
    console.error('SMS lead insert failed:', error);
    return twimlMessage(AUTO_REPLY);
  }

  let assignedRep = null;
  try {
    const result = await assignLead(lead as LeadRow);
    assignedRep = result.rep;
  } catch (err) {
    console.error('assign-lead failed for SMS lead (persisted):', err);
  }

  try {
    await alertRep(lead as LeadRow, assignedRep);
  } catch (err) {
    console.error('rep forward failed (lead persisted):', err);
  }

  try {
    const { data: fresh } = await db.from('leads').select('*').eq('id', lead.id).single();
    await deliverLead((fresh ?? lead) as LeadRow, assignedRep);
  } catch (err) {
    console.error('delivery failed for SMS lead (persisted):', err);
  }

  return twimlMessage(AUTO_REPLY);
}
