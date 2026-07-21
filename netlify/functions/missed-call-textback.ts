// Missed-call text-back — STUBBED/DISABLED (SPEC.md §9.3).
// The (866) line is not yet fronted by Twilio (TODO.md Part 2E). Once it is:
//   1. Point the Twilio number's "call comes in / status callback" webhook here.
//   2. Set MISSED_CALL_TEXTBACK_ENABLED=true.
//   3. Implement: on unanswered call, create a lead (source='sms') and
//      sendSms(caller, textback copy), then forward to the territory rep —
//      the building blocks in lib/ (assignLead, sendSms, stateFromPhone)
//      already cover all of it.
import type { Context } from '@netlify/functions';

export default async function handler(_req: Request, _context: Context): Promise<Response> {
  if (process.env.MISSED_CALL_TEXTBACK_ENABLED !== 'true') {
    return new Response('Missed-call text-back is not enabled', { status: 501 });
  }
  // TODO: implement when the 866 line fronts through Twilio (TODO.md Part 2E).
  return new Response('Not implemented', { status: 501 });
}
