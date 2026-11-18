import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
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

const ROUTE = '/api/cron/google-signup-drought';
const LOOKBACK_HOURS = 8;
const ALERT_RECORD_JOB = 'google-signup-drought-alert';

const TRAFFIC_LABEL = {
  landing_cta_clicks: 'landing CTA clicks',
  games_started: 'games started',
} as const;

interface Traffic {
  source: keyof typeof TRAFFIC_LABEL;
  count: number;
}

/**
 * POST /api/cron/google-signup-drought
 * Hourly 14:00–21:00 UTC (Israel afternoon). Alerts at most once per UTC day when 8 daytime
 * hours have 0 new Google accounts while people are still arriving.
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
    const googleSignups = await countGoogleSignupsSince(supabase, since);
    const traffic = await readTraffic(supabase, since);
    const inconclusive = traffic === null && googleSignups === 0;
    if (inconclusive) logger.error('[Google signup drought] no traffic source could be read');

    const alert = traffic !== null && shouldAlertGoogleSignupDrought({
      googleSignups,
      arrivals: traffic.count,
      daytimeHours,
    });
    const result = { alert, dry, daytimeHours, googleSignups, traffic, inconclusive, since };

    if (!alert || dry) return NextResponse.json({ success: true, ...result, alertSent: false });

    const day = now.toISOString().slice(0, 10);
    if (await alertAlreadySent(supabase, day)) {
      return NextResponse.json({ success: true, ...result, alertSent: false, alreadySentToday: true });
    }

    const text = `LexiClash Google signup drought: 0 Google signups in ${LOOKBACK_HOURS}h while ${TRAFFIC_LABEL[traffic.source]}=${traffic.count}`;
    logger.error(`[Google signup drought] ${text}`);
    if (!(await sendTelegramMessage(escapeTelegramMarkdownV2(text)))) {
      const err = new Error('Telegram did not confirm the drought alert');
      logger.error('[Google signup drought]', err.message);
      captureApiError(err, ROUTE, { method: 'POST', statusCode: 502 });
      return NextResponse.json({ success: false, ...result, alertSent: false, error: err.message }, { status: 502 });
    }

    await recordAlertSent(supabase, day, now);
    return NextResponse.json({ success: true, ...result, alertSent: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('[Google signup drought]', err.message);
    captureApiError(err, ROUTE, { method: 'POST', statusCode: 500 });
    return NextResponse.json({ error: 'Failed to evaluate Google signup drought' }, { status: 500 });
  }
}

async function readTraffic(supabase: SupabaseClient, since: string): Promise<Traffic | null> {
  const clicks = await readLandingCtaClicks(since);
  if (clicks !== null) return { source: 'landing_cta_clicks', count: clicks };

  const { count, error } = await supabase
    .from('game_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', since);
  if (error || count === null) return null;
  return { source: 'games_started', count };
}

async function readLandingCtaClicks(since: string): Promise<number | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;
  const body = {
    query: {
      kind: 'HogQLQuery',
      query: `SELECT count() AS n FROM events WHERE event = 'growth:landing_cta_clicked' AND properties.$host = 'www.lexiclash.live' AND timestamp >= toDateTime('${since.replace('T', ' ').slice(0, 19)}')`,
    },
  };
  try {
    const res = await fetch('https://eu.posthog.com/api/projects/151059/query/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { results?: Array<Array<number>> };
    const n = json.results?.[0]?.[0];
    return typeof n === 'number' ? n : null;
  } catch {
    return null;
  }
}

async function alertAlreadySent(supabase: SupabaseClient, day: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('cron_heartbeats')
    .select('last_result')
    .eq('job', ALERT_RECORD_JOB)
    .maybeSingle();
  if (error) throw new Error(`alert record read failed: ${error.message}`);
  return (data?.last_result as { alert_day?: string } | null)?.alert_day === day;
}

async function recordAlertSent(supabase: SupabaseClient, day: string, now: Date): Promise<void> {
  const { error } = await supabase.from('cron_heartbeats').upsert(
    { job: ALERT_RECORD_JOB, last_run_at: now.toISOString(), last_result: { alert_day: day } },
    { onConflict: 'job' },
  );
  if (error) throw new Error(`alert sent but not recorded: ${error.message}`);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
