import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { schoolLeadAdminNotify } from '@/lib/email/templates/schoolLeadAdminNotify';
import { validateSchoolLeadPayload } from '@/lib/education/schoolLead';

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// Public (no auth) — a school lead form. Non-admin /api/education/* path, so it is
// served by the Next route handler (Express body-parse 408 only bites /api/admin/*).
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  const v = validateSchoolLeadPayload(body);
  if (!v.ok) return bad(v.error);
  const lead = v.payload;

  const sb = await createClient();

  // Rate limit: max 3 submissions per email per 24h. Evaluated via a SECURITY DEFINER
  // boolean RPC — a plain SELECT here returns 0 under RLS (school_leads SELECT is
  // admin-only), which would silently disable the limit and leave the endpoint
  // spammable. Boolean (not raw count) so anon can't enumerate submissions.
  const { data: rateLimited, error: countErr } = await sb.rpc('school_lead_rate_limited', {
    p_email: lead.email,
  });
  // Fail OPEN by design: a high-value school lead must not be lost to a transient RPC
  // hiccup. But log so a chronically-broken limiter surfaces instead of silently
  // disabling itself (the exact regression this RPC was added to fix).
  if (countErr) console.error('[school-lead] rate-limit check failed, proceeding:', countErr.message);
  if (rateLimited === true) return bad('too many requests in 24h, try again later', 429);

  const ins = await sb.from('school_leads').insert({ ...lead, source: 'for-schools-page' });
  if (ins.error) return bad('insert failed: ' + ins.error.message, 500);

  const tpl = schoolLeadAdminNotify(lead);
  // Fire-and-forget; a delivery hiccup must not fail the lead capture.
  try {
    await sendEmail({ to: 'lexiclash.game@gmail.com', subject: tpl.subject, html: tpl.html });
  } catch { /* noop — row is already persisted */ }

  // Both keys on purpose: this route's error path answers { ok: false, error }, so a caller that
  // checks `ok` saw undefined on success — the shapes disagreed. `success` stays for any existing
  // consumer; `ok` makes the success and failure envelopes match.
  return NextResponse.json({ ok: true, success: true });
}
