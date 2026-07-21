// SendGrid — documented alternative (Twilio-owned; keeps the vendor count
// down if the client prefers). https://docs.sendgrid.com/api-reference/mail-send
import type { EmailEnvelope } from './index';

export async function sendSendgrid(msg: EmailEnvelope): Promise<void> {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('SENDGRID_API_KEY must be set when EMAIL_PROVIDER=sendgrid');
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: { email: msg.from },
      subject: msg.subject,
      content: [
        { type: 'text/plain', value: msg.text },
        ...(msg.html ? [{ type: 'text/html', value: msg.html }] : []),
      ],
    }),
  });
  if (!res.ok) throw new Error(`SendGrid send failed: ${res.status} ${await res.text()}`);
}
