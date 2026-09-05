import { Resend } from 'resend';
import { withTimeout } from '@/lib/server/routeTimeout';

// Every caller (admin grant/approval routes, bulk sends, contact/feedback
// forms) awaits this unbounded otherwise — a slow or hung Resend API call
// then blocks the caller for as long as Resend takes, with no ceiling of its
// own. See lib/education/proGrantServer.ts grantTeacherPro, whose Teacher Pro
// grant requests kept timing out because nothing here (or in the route) ever
// gave up on a stuck send.
const SEND_TIMEOUT_MS = 10000;

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
    const result = await withTimeout(
      resend.emails.send({
        from: senderEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      }),
      SEND_TIMEOUT_MS,
      () => console.warn('[sendEmail] Resend call exceeded', SEND_TIMEOUT_MS, 'ms; to=', to),
    );
    if (result.error) return { ok: false, error: result.error.message || 'send failed' };
    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown error' };
  }
}
