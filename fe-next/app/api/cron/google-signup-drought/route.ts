import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { escapeTelegramMarkdownV2, sendTelegramMessage } from '@/lib/telegram';
import { captureApiError } from '@/utils/sentry';
import logger from '@/utils/logger';
import {
  countGoogleSignupsSince,
  daytimeHoursEndingAt,
  shouldAlertGoogleSignupDrought,
} from '@/lib/auth/googleSignupDrought';

const LOOKBACK_HOURS = 8;

/**
 * POST /api/cron/google-signup-drought
 * Hourly 14:00–21:00 UTC (Israel afternoon). Alerts when 8 daytime hours have
 * 0 new Google accounts while people are still arriving.
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
    const { count: gamesStarted, error: gamesError } = await supabase
      .from('game_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', since);
    if (gamesError) throw new Error(gamesError.message);
    const googleSignups = await countGoogleSignupsSince(supabase, since);
    const landingCtaClicked = await landingCtaOrGames(since, gamesStarted ?? 0);
    const alert = shouldAlertGoogleSignupDrought({
      googleSignups,
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
      googleSignups,
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
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) return gamesStarted;
  const json = await res.json() as { results?: Array<Array<number>> };
  const n = json.results?.[0]?.[0];
  return typeof n === 'number' ? n : gamesStarted;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
