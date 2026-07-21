// Resend — default email provider (one API key, minimal setup from a
// Netlify Function). https://resend.com/docs/api-reference/emails/send-email
import type { EmailEnvelope } from './index';

export async function sendResend(msg: EmailEnvelope): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY must be set when EMAIL_PROVIDER=resend');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: msg.from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      ...(msg.html ? { html: msg.html } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
}
