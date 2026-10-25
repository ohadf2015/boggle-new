import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { sendEmail } from '@/lib/email/send';
import { schoolLeadAdminNotify } from '@/lib/email/templates/schoolLeadAdminNotify';
import { validateSchoolLeadPayload } from '@/lib/education/schoolLead';
import { SCHOOL_LEAD_NOTIFY_TO } from '@/lib/education/schoolLeadNotify';

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// Public (no auth) — a school lead form. Non-admin /api/education/* path, so it is
// served by the Next route handler (Express body-parse 408 only bites /api/admin/*).
export async function POST(req: Request) {
  // Per-IP on top of per-email: rotating addresses must not flood the inbox.
  const ipLimit = checkApiRateLimit(req as never, 'education-school-lead', { maxRequests: 5, windowMs: 60 * 60_000 });
  if (!ipLimit.success) return bad('too many requests, try again later', 429);

  let body: unknown;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  const v = validateSchoolLeadPayload(body);
  if (!v.ok) return bad(v.error);
  const lead = v.payload;

  // Service role: anon has no EXECUTE on the limiter, so on the request client it always
  // errored and the per-email limit never applied to logged-out visitors.
  const admin = createAdminClient();
  const limiter = admin
    ? await admin.rpc('school_lead_rate_limited', { p_email: lead.email })
    : { data: null, error: { message: 'service role key not configured' } };
  if (limiter.error) {
    console.error('[school-lead] rate-limit check failed, refusing:', limiter.error.message);
    return bad('could not submit right now, please try again in a minute', 503);
  }
  if (limiter.data === true) return bad('too many requests in 24h, try again later', 429);

  const sb = await createClient();
  const ins = await sb.from('school_leads').insert({ ...lead });
  if (ins.error) {
    console.error('[school-lead] insert failed:', ins.error.message);
    return bad('could not submit right now, please try again', 500);
  }

  const submittedAt = new Date().toISOString();
  const tpl = schoolLeadAdminNotify({ ...lead, submittedAt });
  // Fire-and-forget; a delivery hiccup must not fail the lead capture.
  try {
    const result = await sendEmail({
      to: SCHOOL_LEAD_NOTIFY_TO,
      subject: tpl.subject,
      html: tpl.html,
      replyTo: lead.email,
    });
    if (!result.ok) console.error('[school-lead] notify failed:', result.error);
  } catch (e) {
    console.error('[school-lead] notify threw:', e);
  }

  // Both keys on purpose: this route's error path answers { ok: false, error }, so a caller that
  // checks `ok` saw undefined on success — the shapes disagreed. `success` stays for any existing
  // consumer; `ok` makes the success and failure envelopes match.
  return NextResponse.json({ ok: true, success: true });
}
