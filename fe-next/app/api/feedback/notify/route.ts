import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import logger from '@/utils/logger';
import { captureApiError } from '@/utils/sentry';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { withTimeout, EMAIL_COLORS } from '@/lib/email';

/**
 * Close the loop on a bug report — automatically.
 *
 * `/api/feedback` fans a report OUT (Supabase + Telegram + email to the founder).
 * Nothing ever went back the other way: a player who took the trouble to report
 * a bug got shipped a fix and never heard about it, and every row sat at
 * `status='new'` forever. The company-brain sweeper calls this once the work that
 * a report produced is finished, so the reporter is told by the same pipeline
 * that fixed it and nobody has to remember.
 *
 * Auth is CRON_SECRET (fail-closed, constant-time) — the same shared secret the
 * scheduled routes use, so there is no new credential to provision.
 *
 * Idempotent: a report already marked notified is skipped unless `force` is set,
 * because a retried sweep must not mail the same person twice.
 */

export const runtime = 'nodejs';

const FEEDBACK_EMAIL = 'lexiclash.game@gmail.com';
const NOTIFIED_STATUS = 'resolved_notified';
const NO_CONTACT_STATUS = 'resolved_no_contact';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * The reporter's address.
 *
 * `feedback_reports.email` is an OPTIONAL field in the report modal, so it is
 * null for most rows — including the 2026-09-02 "ice" report that prompted this
 * route. A signed-in reporter still has an address on their auth record, and
 * that is the one worth using: they are a registered player, so telling them the
 * bug is fixed is a retention message, not cold mail. Anonymous reporters simply
 * have no address and are marked as such rather than silently dropped.
 */
export async function resolveRecipient(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  report: { email: string | null; user_id: string | null },
): Promise<string | null> {
  if (report.email) return report.email;
  if (!report.user_id || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.admin.getUserById(report.user_id);
    if (error) return null;
    const email = data?.user?.email;
    return email && !data.user.is_anonymous ? email : null;
  } catch {
    return null;
  }
}

interface NotifyBody {
  reportId?: unknown;
  summary?: unknown;
  subject?: unknown;
  force?: unknown;
  dryRun?: unknown;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as NotifyBody;
    const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : '';
    const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 2000) : '';
    const force = body.force === true;
    const dryRun = body.dryRun === true;

    if (!reportId || !summary) {
      return NextResponse.json({ error: 'reportId and summary are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: report, error: readError } = await supabase
      .from('feedback_reports')
      .select('id, message, email, user_id, username, status, locale')
      .eq('id', reportId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    if (report.status === NOTIFIED_STATUS && !force) {
      return NextResponse.json({ ok: true, emailed: false, reason: 'already_notified' });
    }

    const recipient = await resolveRecipient(supabase, report);

    if (!recipient) {
      if (!dryRun) {
        await supabase
          .from('feedback_reports')
          .update({ status: NO_CONTACT_STATUS })
          .eq('id', reportId);
      }
      return NextResponse.json({ ok: true, emailed: false, reason: 'no_contact' });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resend || !fromEmail) {
      return NextResponse.json({ error: 'Email transport not configured' }, { status: 503 });
    }
    if (dryRun) {
      return NextResponse.json({ ok: true, emailed: false, reason: 'dry_run', recipient });
    }

    const c = EMAIL_COLORS as Record<string, string>;
    const greeting = report.username ? `Hi ${report.username},` : 'Hi,';
    const quoted = (report.message || '').slice(0, 400);

    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: recipient,
        replyTo: FEEDBACK_EMAIL,
        subject:
          typeof body.subject === 'string' && body.subject.trim()
            ? body.subject.trim().slice(0, 120)
            : 'Your LexiClash bug report is fixed',
        text: `${greeting}\n\nYou reported:\n"${quoted}"\n\nIt's fixed and live.\n\n${summary}\n\nThanks for taking the time to tell us — reports like yours are how this gets better.\n\n— LexiClash`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${c.navy || '#1a1a2e'}; padding: 24px; border-radius: 12px;">
            <h2 style="color: ${c.lime || '#BFFF00'};">🛠️ Fixed — thanks to you</h2>
            <p style="color: ${c.white || '#fff'};">${escapeHtml(greeting)}</p>
            <blockquote style="border-left: 3px solid ${c.lime || '#BFFF00'}; margin: 16px 0; padding-left: 12px; color: ${c.gray || '#aaa'}; white-space: pre-wrap;">${escapeHtml(quoted)}</blockquote>
            <p style="color: ${c.white || '#fff'}; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(summary)}</p>
            <p style="color: ${c.gray || '#aaa'}; font-size: 13px;">Thanks for taking the time to tell us — reports like yours are how this gets better.</p>
          </div>`,
      }),
      10_000,
      'Resend API timed out after 10 seconds'
    );

    if (result.error) {
      logger.error('[FeedbackNotify] Resend error:', result.error);
      return NextResponse.json({ error: 'Email send failed' }, { status: 502 });
    }

    await supabase.from('feedback_reports').update({ status: NOTIFIED_STATUS }).eq('id', reportId);

    return NextResponse.json({ ok: true, emailed: true, recipient });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[FeedbackNotify] Unexpected error:', msg);
    captureApiError(error instanceof Error ? error : new Error(msg), '/api/feedback/notify', {
      method: 'POST',
      statusCode: 500,
    });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
