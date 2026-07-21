// Email delivery for pre-CRM mode (CRM_ENABLED=false): the lead lands in an
// inbox, GoDaddy-form style, while Supabase keeps the durable record.
// Provider selected by EMAIL_PROVIDER: resend (default) | sendgrid | smtp.
import { sendResend } from './resend';
import { sendSendgrid } from './sendgrid';
import { sendSmtp } from './smtp';

export interface EmailMessage {
  subject: string;
  text: string;
  html?: string;
}

export interface EmailEnvelope extends EmailMessage {
  to: string;
  from: string;
}

const providers: Record<string, (msg: EmailEnvelope) => Promise<void>> = {
  resend: sendResend,
  sendgrid: sendSendgrid,
  smtp: sendSmtp,
};

export async function sendLeadEmail(msg: EmailMessage): Promise<void> {
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  if (!to || !from) {
    throw new Error('LEAD_EMAIL_TO and LEAD_EMAIL_FROM must be set when CRM_ENABLED=false');
  }
  const provider = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase();
  const send = providers[provider];
  if (!send) {
    throw new Error(
      `Unknown EMAIL_PROVIDER "${provider}" — expected one of ${Object.keys(providers).join(', ')}`,
    );
  }
  await send({ ...msg, to, from });
}
