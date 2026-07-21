// STUB. TODO: implement if the client insists on raw SMTP (requires adding
// nodemailer and SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). Resend or SendGrid
// are the supported paths; throwing keeps leads safe — they persist in
// Supabase with crm_status='failed' and retry every 15 minutes.
import type { EmailEnvelope } from './index';

export async function sendSmtp(_msg: EmailEnvelope): Promise<void> {
  throw new Error('SMTP email adapter not implemented — use EMAIL_PROVIDER=resend or sendgrid');
}
