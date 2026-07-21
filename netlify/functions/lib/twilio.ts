// Minimal Twilio REST helpers via fetch — no SDK dependency needed for
// send-SMS + webhook signature validation.
import { createHmac } from 'node:crypto';

function creds() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  return { sid, token, from };
}

export async function sendSms(
  to: string,
  body: string,
): Promise<{ sent: boolean; skipped?: string }> {
  const { sid, token, from } = creds();
  if (!sid || !token || !from) return { sent: false, skipped: 'twilio env vars not set' };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio send failed: ${res.status} ${await res.text()}`);
  return { sent: true };
}

/** Fetch inbound MMS media using Twilio credentials. */
export async function fetchTwilioMedia(url: string): Promise<ArrayBuffer> {
  const { sid, token } = creds();
  const res = await fetch(url, {
    headers:
      sid && token
        ? { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` }
        : {},
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`media fetch failed: ${res.status}`);
  return res.arrayBuffer();
}

/**
 * Validate X-Twilio-Signature for a form-encoded webhook POST.
 * Skips (returns true) when TWILIO_AUTH_TOKEN is unset, so local testing works.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const { token } = creds();
  if (!token) return true;
  if (!signature) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
  const expected = createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
  return expected === signature;
}

export function twimlMessage(body: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</Message></Response>`;
  return new Response(xml, { headers: { 'content-type': 'text/xml' } });
}
