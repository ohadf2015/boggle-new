import { Resend } from 'resend';

interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailArgs): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn('[sendEmail] RESEND_API_KEY not set; skipping send to', to);
    return { ok: false, error: 'no api key' };
  }
  try {
    const senderEmail = from || process.env.RESEND_FROM_EMAIL || 'LexiClash <noreply@lexiclash.live>';
    const result = await resend.emails.send({
      from: senderEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (result.error) return { ok: false, error: result.error.message || 'send failed' };
    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown error' };
  }
}
