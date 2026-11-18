import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { escapeTelegramMarkdownV2, sendTelegramMessage } from '@/lib/telegram';
import { captureApiError } from '@/utils/sentry';
import logger from '@/utils/logger';
import {
  daytimeHoursEndingAt,
  shouldAlertGoogleSignupDrought,
} from '@/lib/auth/googleSignupDrought';

const LOOKBACK_HOURS = 8;

/**
 * POST /api/cron/google-signup-drought
 * Hourly 14:00–21:00 UTC (Israel afternoon). Alerts when 8 daytime hours have
 * 0 new Google accounts while the landing CTA is still being clicked.
 * `?dry=1` evaluates and sends nothing.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_HOURS * 3_600_000).toISOString();
  const daytimeHours = daytimeHoursEndingAt(now, LOOKBACK_HOURS);

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('no service-role client');
    const { data, error } = await supabase.rpc('google_signup_drought_counts', { p_since: since });
    if (error || !data) throw new Error(error?.message ?? 'no counts');
    const counts = data as { google_signups: number; games_started: number };
    const landingCtaClicked = await landingCtaOrGames(since, counts.games_started);
    const alert = shouldAlertGoogleSignupDrought({
      googleSignups: Number(counts.google_signups) || 0,
      landingCtaClicked,
      daytimeHours,
    });
    if (alert && !dry) {
      const text = `LexiClash Google signup drought: 0 Google signups in ${LOOKBACK_HOURS}h while landing CTA clicks=${landingCtaClicked}`;
      logger.error(`[Google signup drought] ${text}`);
      await sendTelegramMessage(escapeTelegramMarkdownV2(text));
    }
    return NextResponse.json({
      success: true,
      alert,
      dry,
      daytimeHours,
      googleSignups: counts.google_signups,
      landingCtaClicked,
      since,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('[Google signup drought]', err.message);
    captureApiError(err, '/api/cron/google-signup-drought', { method: 'POST', statusCode: 500 });
    return NextResponse.json({ error: 'Failed to evaluate Google signup drought' }, { status: 500 });
  }
}

async function landingCtaOrGames(since: string, gamesStarted: number): Promise<number> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return gamesStarted;
  const body = {
    query: {
      kind: 'HogQLQuery',
      query: `SELECT count() AS n FROM events WHERE event = 'growth:landing_cta_clicked' AND properties.$host = 'www.lexiclash.live' AND timestamp >= toDateTime('${since.replace('T', ' ').slice(0, 19)}')`,
    },
  };
  const res = await fetch('https://eu.posthog.com/api/projects/151059/query/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return gamesStarted;
  const json = await res.json() as { results?: Array<Array<number>> };
  const n = json.results?.[0]?.[0];
  return typeof n === 'number' ? n : gamesStarted;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
