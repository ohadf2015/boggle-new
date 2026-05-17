/**
 * Daily-challenge push reminder recipient selection.
 * Mirrors email.ts cron pattern but gates on "didn't play today" instead of
 * daily_email_subscribed. Source of truth: user_push_tokens (only users with
 * an active device token can receive push anyway).
 */

import logger from '@/backend/utils/logger';
import { isPushLocale, type PushLocale } from '@/backend/utils/pushTranslations';
import { getSupabaseAdmin, getLocalHour, getLocalMinuteOfDay, getTodayDate } from './email';
import { addMinutesWrap, inWindow } from './smartReminderTime';

const REMINDER_HOUR_MIN = 17;
const REMINDER_HOUR_MAX = 19;

/**
 * Cold-start fallback default window. Used by the smart cron when the user
 * has no avg-row yet (brand-new install, sample_size < 3). Active push token
 * = user already consented, so reaching them at this default range is using
 * existing permission. Mirrors the legacy non-smart cron's window so behavior
 * is consistent if a user crosses the 3-sample threshold mid-rollout.
 */
const COLD_START_HOUR_MIN = REMINDER_HOUR_MIN;
const COLD_START_HOUR_MAX = REMINDER_HOUR_MAX;

// Smart-reminder constants. Push fires when current local time falls inside
// [avg + OFFSET, avg + OFFSET + WINDOW). Hourly cron tick = WINDOW must be >= 60
// to guarantee every user gets exactly one tick that includes them.
const SMART_OFFSET_MINUTES = 30;
const SMART_WINDOW_MINUTES = 60;

export interface DailyPushRecipient {
  userId: string;
  locale: PushLocale;
  /** Avatar gender for gendered-grammar copy (Hebrew, Spanish). Defaults to 'male' on the avatar schema, so missing/legacy rows fall through to the neutral/masculine template. */
  gender?: 'male' | 'female';
}

/** Pull gender from a profiles.avatar_config jsonb row (defensive on legacy/null rows). */
function extractGender(avatarConfig: unknown): 'male' | 'female' | undefined {
  if (avatarConfig && typeof avatarConfig === 'object') {
    const g = (avatarConfig as { gender?: unknown }).gender;
    if (g === 'female') return 'female';
    if (g === 'male') return 'male';
  }
  return undefined;
}

export async function getDailyChallengePushRecipients(): Promise<DailyPushRecipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    logger.error?.('PUSH_REMINDER', 'Supabase admin not available');
    return [];
  }

  const today = getTodayDate();

  const { data: tokens, error: tokensErr } = await supabase
    .from('user_push_tokens')
    .select('user_id')
    .eq('is_active', true);

  if (tokensErr) {
    logger.error?.('PUSH_REMINDER', `tokens query failed: ${tokensErr.message}`);
    return [];
  }
  if (!tokens || tokens.length === 0) return [];

  const userIds = Array.from(new Set(tokens.map((t: { user_id: string }) => t.user_id)));

  // Pull `language` + `avatar_config` alongside scheduling fields so the cron
  // can avoid an N+1 round-trip downstream — locale + gender both come in one
  // query.
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, timezone, last_daily_push_sent_at, language, avatar_config')
    .in('id', userIds);

  if (profilesErr) {
    logger.error?.('PUSH_REMINDER', `profiles query failed: ${profilesErr.message}`);
    return [];
  }
  if (!profiles || profiles.length === 0) return [];

  // "Played" = has any attempt row (started or completed) in either daily mode today.
  // Row existence alone counts — started-but-abandoned still means the user saw today's
  // puzzle, so a reminder would be noise. Both tables have UNIQUE(puzzle_date, player_id).
  const [puzzleRes, wordHuntRes] = await Promise.all([
    supabase
      .from('daily_puzzle_attempts')
      .select('player_id')
      .eq('puzzle_date', today)
      .in('player_id', userIds),
    supabase
      .from('daily_word_hunt_attempts')
      .select('player_id')
      .eq('puzzle_date', today)
      .in('player_id', userIds),
  ]);

  if (puzzleRes.error) {
    logger.error?.('PUSH_REMINDER', `puzzle attempts query failed: ${puzzleRes.error.message}`);
    return [];
  }
  if (wordHuntRes.error) {
    logger.error?.('PUSH_REMINDER', `word hunt attempts query failed: ${wordHuntRes.error.message}`);
    return [];
  }

  const playedIds = new Set<string>();
  for (const r of (puzzleRes.data ?? []) as Array<{ player_id: string | null }>) {
    if (r.player_id) playedIds.add(r.player_id);
  }
  for (const r of (wordHuntRes.data ?? []) as Array<{ player_id: string | null }>) {
    if (r.player_id) playedIds.add(r.player_id);
  }

  // Batch-fetch notification preferences. Users with push_enabled=false or
  // daily_challenge=false are excluded. Missing row = defaults (both on).
  const { data: prefRows, error: prefsErr } = await supabase
    .from('user_notification_preferences')
    .select('user_id, push_enabled, daily_challenge')
    .in('user_id', userIds);

  if (prefsErr) {
    logger.error?.('PUSH_REMINDER', `prefs query failed: ${prefsErr.message}`);
    return [];
  }

  const optedOut = new Set<string>();
  for (const row of (prefRows ?? []) as Array<{
    user_id: string;
    push_enabled: boolean | null;
    daily_challenge: boolean | null;
  }>) {
    if (row.push_enabled === false || row.daily_challenge === false) {
      optedOut.add(row.user_id);
    }
  }

  const recipients: DailyPushRecipient[] = [];
  for (const p of profiles as Array<{
    id: string;
    timezone: string | null;
    last_daily_push_sent_at: string | null;
    language: string | null;
    avatar_config: unknown;
  }>) {
    if (playedIds.has(p.id)) continue;
    if (optedOut.has(p.id)) continue;

    if (p.last_daily_push_sent_at) {
      const lastDate = new Date(p.last_daily_push_sent_at).toISOString().split('T')[0];
      if (lastDate === today) continue;
    }

    const localHour = getLocalHour(p.timezone || 'UTC');
    if (localHour < REMINDER_HOUR_MIN || localHour > REMINDER_HOUR_MAX) continue;

    const locale: PushLocale = isPushLocale(p.language) ? p.language : 'en';
    const gender = extractGender(p.avatar_config);
    recipients.push({ userId: p.id, locale, ...(gender ? { gender } : {}) });
  }

  return recipients;
}

/**
 * Smart variant of {@link getDailyChallengePushRecipients}. Instead of a
 * fixed 17–19 local-hour window, schedules each user's reminder to fire
 * 30 minutes after their typical play time (circular mean over the last
 * 30 days, sample size >= 3). Users who have never played, or whose
 * sample is too small, are excluded — `if he did at all` per design.
 *
 * Designed to run on an hourly cron. The view + per-user window logic
 * picks up only the slice of users whose target time matches the current
 * tick, so the same ID never gets pushed twice in one day.
 */
export async function getSmartDailyChallengePushRecipients(
  now: Date = new Date()
): Promise<DailyPushRecipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    logger.error?.('PUSH_REMINDER', 'Supabase admin not available');
    return [];
  }

  const today = getTodayDate();

  const { data: tokens, error: tokensErr } = await supabase
    .from('user_push_tokens')
    .select('user_id')
    .eq('is_active', true);

  if (tokensErr) {
    logger.error?.('PUSH_REMINDER', `tokens query failed: ${tokensErr.message}`);
    return [];
  }
  if (!tokens || tokens.length === 0) return [];

  const userIds = Array.from(new Set(tokens.map((t: { user_id: string }) => t.user_id)));

  const [profilesRes, avgRes, puzzleRes, wordHuntRes, prefRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, timezone, last_daily_push_sent_at, language, avatar_config')
      .in('id', userIds),
    supabase
      .from('v_user_daily_play_avg')
      .select('player_id, timezone, sample_size, avg_play_minute_of_day')
      .in('player_id', userIds),
    supabase
      .from('daily_puzzle_attempts')
      .select('player_id')
      .eq('puzzle_date', today)
      .in('player_id', userIds),
    supabase
      .from('daily_word_hunt_attempts')
      .select('player_id')
      .eq('puzzle_date', today)
      .in('player_id', userIds),
    supabase
      .from('user_notification_preferences')
      .select('user_id, push_enabled, daily_challenge')
      .in('user_id', userIds),
  ]);

  if (profilesRes.error) {
    logger.error?.('PUSH_REMINDER', `profiles query failed: ${profilesRes.error.message}`);
    return [];
  }
  if (avgRes.error) {
    logger.error?.('PUSH_REMINDER', `avg view query failed: ${avgRes.error.message}`);
    return [];
  }
  if (puzzleRes.error || wordHuntRes.error || prefRes.error) {
    const msg =
      puzzleRes.error?.message || wordHuntRes.error?.message || prefRes.error?.message;
    logger.error?.('PUSH_REMINDER', `attempts/prefs query failed: ${msg}`);
    return [];
  }

  const profiles = (profilesRes.data ?? []) as Array<{
    id: string;
    timezone: string | null;
    last_daily_push_sent_at: string | null;
    language: string | null;
    avatar_config: unknown;
  }>;
  if (profiles.length === 0) return [];

  // user_id → avg row. Skipping never-played users = excluding any user
  // missing from this map, which is what `if he did at all` requires.
  const avgByUser = new Map<string, { timezone: string | null; avg_play_minute_of_day: number }>();
  for (const r of (avgRes.data ?? []) as Array<{
    player_id: string;
    timezone: string | null;
    avg_play_minute_of_day: number;
  }>) {
    avgByUser.set(r.player_id, {
      timezone: r.timezone,
      avg_play_minute_of_day: r.avg_play_minute_of_day,
    });
  }

  const playedIds = new Set<string>();
  for (const r of (puzzleRes.data ?? []) as Array<{ player_id: string | null }>) {
    if (r.player_id) playedIds.add(r.player_id);
  }
  for (const r of (wordHuntRes.data ?? []) as Array<{ player_id: string | null }>) {
    if (r.player_id) playedIds.add(r.player_id);
  }

  const optedOut = new Set<string>();
  for (const row of (prefRes.data ?? []) as Array<{
    user_id: string;
    push_enabled: boolean | null;
    daily_challenge: boolean | null;
  }>) {
    if (row.push_enabled === false || row.daily_challenge === false) {
      optedOut.add(row.user_id);
    }
  }

  const recipients: DailyPushRecipient[] = [];
  for (const p of profiles) {
    if (playedIds.has(p.id)) continue;
    if (optedOut.has(p.id)) continue;

    if (p.last_daily_push_sent_at) {
      const lastDate = new Date(p.last_daily_push_sent_at).toISOString().split('T')[0];
      if (lastDate === today) continue;
    }

    const avg = avgByUser.get(p.id);

    if (avg) {
      // Established cohort: smart per-user window (avg play time + 30min).
      // Prefer the timezone that was used to compute the avg, so the
      // window math stays consistent if the profile TZ has since moved.
      const tz = avg.timezone || p.timezone || 'UTC';
      const target = addMinutesWrap(avg.avg_play_minute_of_day, SMART_OFFSET_MINUTES);
      const currentLocalMin = getLocalMinuteOfDay(tz, now);
      if (!inWindow(currentLocalMin, target, SMART_WINDOW_MINUTES)) continue;
    } else {
      // Cold-start fallback: no avg-row yet (brand-new install or
      // sample_size < 3). Default 17–19 local-hour window is the legacy
      // non-smart contract; reaching users here uses their existing push
      // consent without the 3-day gap before v_user_daily_play_avg
      // populates. Closes the D1-retention reach hole flagged 2026-05-05.
      const tz = p.timezone || 'UTC';
      const localHour = getLocalHour(tz);
      if (localHour < COLD_START_HOUR_MIN || localHour > COLD_START_HOUR_MAX) continue;
    }

    const locale: PushLocale = isPushLocale(p.language) ? p.language : 'en';
    const gender = extractGender(p.avatar_config);
    recipients.push({ userId: p.id, locale, ...(gender ? { gender } : {}) });
  }

  return recipients;
}

/**
 * Single-user mark — kept for callers outside the hourly cron. The cron
 * itself MUST use {@link markDailyPushSentBatch} to avoid an N+1 fan-out
 * that previously saturated the Supabase semaphore (Sentry 136).
 */
export async function markDailyPushSent(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ last_daily_push_sent_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    logger.error?.('PUSH_REMINDER', `mark sent failed for ${userId}: ${error.message}`);
  }
}

/**
 * Batch mark used by the hourly daily-challenge reminder cron. One UPDATE
 * with `IN (...)` instead of N parallel UPDATEs — the previous fan-out
 * (lib/pushReminders.markDailyPushSent per recipient) drove queue depth
 * past the 25-slot semaphore and produced the recurring [SUPABASE]
 * Request queue depth Sentry warning.
 */
export async function markDailyPushSentBatch(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ last_daily_push_sent_at: new Date().toISOString() })
    .in('id', userIds);
  if (error) {
    logger.error?.('PUSH_REMINDER', `batch mark sent failed (${userIds.length} ids): ${error.message}`);
  }
}
