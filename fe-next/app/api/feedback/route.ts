import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import logger from '@/utils/logger';
import { captureApiError } from '@/utils/sentry';
import { checkApiRateLimit, rateLimitResponse, addRateLimitHeaders } from '@/lib/apiRateLimit';
import { withTimeout, EMAIL_COLORS } from '@/lib/email';
import { sendTelegramMessage, escapeTelegramMarkdownV2, isTelegramConfigured } from '@/lib/telegram';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';

/**
 * Feedback / Bug-Report API
 *
 * Receives in-app bug reports from the "Report a Bug" modal and fans them out
 * to every available channel so the founder actually sees them:
 *   1. Supabase `feedback_reports` (durable record)
 *   2. Telegram (instant founder ping — token+chat live on Railway prod)
 *   3. Resend email fallback
 * Succeeds if ANY channel accepts the report. Anonymous reports allowed.
 */

const FEEDBACK_EMAIL = 'lexiclash.game@gmail.com';

// Stricter than contact: a bug-report click should never be a spam vector.
const FEEDBACK_RATE_LIMIT = {
  maxRequests: 8,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 6 * 60 * 60 * 1000, // 6 hour block for abuse
};

// Bug report rewards (1 per UTC day per user)
const BUG_REPORT_XP = 100;
const BUG_REPORT_COINS = 25;

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

interface FeedbackFields {
  message: string;
  page: string;
  userAgent: string;
  userId: string | null;
  username: string | null;
  email: string | null;
  locale: string;
  viewport: string;
  appVersion: string;
}

/** Build the founder-facing Telegram message (MarkdownV2, all dynamic parts escaped). */
function buildTelegramMessage(f: FeedbackFields): string {
  const esc = escapeTelegramMarkdownV2;
  const userDisplay = f.username ? `${esc(f.username)} (${esc(f.userId || '')})` : (f.userId ? esc(f.userId) : '_anonymous_');
  const lines = [
    '🐞 *New Bug Report / Feedback*',
    '',
    esc(f.message),
    '',
    `*Page:* ${esc(f.page) || '_unknown_'}`,
    `*User:* ${userDisplay}`,
    `*Locale:* ${esc(f.locale) || '_?_'}`,
    `*Browser:* ${esc(f.userAgent.slice(0, 180)) || '_?_'}`,
  ];
  if (f.viewport) lines.push(`*Viewport:* ${esc(f.viewport)}`);
  if (f.appVersion) lines.push(`*App:* ${esc(f.appVersion)}`);
  if (f.email) lines.push(`*Reply to:* ${esc(f.email)}`);
  return lines.join('\n');
}

async function sendEmail(f: FeedbackFields): Promise<boolean> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resend || !fromEmail) {
    logger.log('[Feedback] Resend not configured, skipping email');
    return false;
  }
  const c = EMAIL_COLORS as Record<string, string>;
  const userDisplay = f.username ? `${f.username} (${f.userId})` : (f.userId || 'anonymous');
  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: FEEDBACK_EMAIL,
        ...(f.email ? { replyTo: f.email } : {}),
        subject: `[LexiClash Bug] ${f.message.slice(0, 60)}`,
        text: `Bug report:\n\n${f.message}\n\nPage: ${f.page}\nUser: ${userDisplay}\nEmail: ${f.email || 'n/a'}\nLocale: ${f.locale}\nViewport: ${f.viewport}\nApp: ${f.appVersion}\nBrowser: ${f.userAgent}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${c.navy || '#1a1a2e'}; padding: 24px; border-radius: 12px;">
            <h2 style="color: ${c.lime || '#BFFF00'};">🐞 New Bug Report</h2>
            <p style="white-space: pre-wrap; color: ${c.white || '#fff'}; line-height: 1.6;">${escapeHtml(f.message)}</p>
            <hr style="border-color: ${c.grayDark || '#333'};" />
            <p style="color: ${c.gray || '#aaa'}; font-size: 13px;">
              Page: ${escapeHtml(f.page)}<br/>
              User: ${escapeHtml(userDisplay)}<br/>
              Reply: ${f.email ? escapeHtml(f.email) : 'n/a'}<br/>
              Locale: ${escapeHtml(f.locale)} · Viewport: ${escapeHtml(f.viewport)} · App: ${escapeHtml(f.appVersion)}<br/>
              Browser: ${escapeHtml(f.userAgent)}
            </p>
          </div>`,
      }),
      10_000,
      'Resend API timed out after 10 seconds'
    );
    if (result.error) {
      logger.error('[Feedback] Resend error:', result.error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('[Feedback] Email failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'feedback', FEEDBACK_RATE_LIMIT);
  if (!rateLimit.success) {
    logger.warn('[Feedback] Rate limit exceeded');
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();

    const message = str(body.message, 5000);
    if (message.length < 10) {
      return NextResponse.json(
        { error: 'Please describe what happened (at least 10 characters).' },
        { status: 400 }
      );
    }

    const rawEmail = str(body.email, 255).toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const fields: FeedbackFields = {
      message,
      page: str(body.page, 300),
      userAgent: str(body.userAgent, 500),
      userId: typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim().slice(0, 64) : null,
      username: null,
      email: rawEmail && emailRegex.test(rawEmail) ? rawEmail : null,
      locale: str(body.locale, 8),
      viewport: str(body.viewport, 24),
      appVersion: str(body.appVersion, 32),
    };

    // Look up username server-side (do not trust client)
    const supabase = getSupabaseAdmin();
    if (fields.userId && supabase) {
      const { data: prof } = await supabase.from('profiles').select('username').eq('id', fields.userId).single();
      fields.username = prof?.username ?? null;
    }

    // 1. Durable record + reward tracking
    let dbStored = false;
    let shouldReward = false;
    if (supabase) {
      // Check if already rewarded today (UTC)
      if (fields.userId) {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('feedback_reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', fields.userId)
          .eq('reward_granted', true)
          .gte('created_at', todayStart.toISOString());
        shouldReward = (count ?? 0) === 0;
      }

      const { error } = await supabase.from('feedback_reports').insert({
        message: fields.message,
        page: fields.page || null,
        user_agent: fields.userAgent || null,
        user_id: fields.userId,
        username: fields.username,
        email: fields.email,
        locale: fields.locale || null,
        viewport: fields.viewport || null,
        app_version: fields.appVersion || null,
        source: 'web',
        status: 'new',
        reward_granted: shouldReward,
        created_at: new Date().toISOString(),
      });
      if (error) {
        logger.error('[Feedback] DB insert error:', error);
        captureApiError(new Error(error.message), '/api/feedback', { method: 'POST', statusCode: 500 });
      } else {
        dbStored = true;
      }
    }

    // Grant reward if qualified (best-effort, never block the response)
    if (dbStored && shouldReward && fields.userId) {
      try {
        await supabase?.rpc('increment_player_xp', { p_player_id: fields.userId, p_xp_amount: BUG_REPORT_XP });
      } catch (err) {
        logger.error('[Feedback] XP grant failed:', err instanceof Error ? err.message : String(err));
      }
      try {
        await awardCoinsServer(fields.userId, BUG_REPORT_COINS, 'bug_report', { source: 'feedback' });
      } catch (err) {
        logger.error('[Feedback] Coin grant failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // 2. Telegram + 3. Email — run in parallel, don't let one block the other.
    const [tgSent, emailSent] = await Promise.all([
      isTelegramConfigured() ? sendTelegramMessage(buildTelegramMessage(fields)) : Promise.resolve(false),
      sendEmail(fields),
    ]);

    if (!dbStored && !tgSent && !emailSent) {
      return NextResponse.json(
        { error: 'Could not send your report. Please try again shortly.' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true, rewarded: dbStored && shouldReward });
    return addRateLimitHeaders(response, rateLimit, FEEDBACK_RATE_LIMIT.maxRequests);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[Feedback] Unexpected error:', msg);
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/feedback', {
      method: 'POST',
      statusCode: 500,
    });
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
