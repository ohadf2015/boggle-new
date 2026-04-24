/**
 * Daily-challenge push reminder recipient selection.
 * Mirrors email.ts cron pattern but gates on "didn't play today" instead of
 * daily_email_subscribed. Source of truth: user_push_tokens (only users with
 * an active device token can receive push anyway).
 */

import logger from '@/backend/utils/logger';
import { getSupabaseAdmin, getLocalHour, getTodayDate } from './email';

const REMINDER_HOUR_MIN = 17;
const REMINDER_HOUR_MAX = 19;

export async function getDailyChallengePushRecipients(): Promise<string[]> {
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

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, timezone, last_daily_push_sent_at')
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

  const recipients: string[] = [];
  for (const p of profiles as Array<{
    id: string;
    timezone: string | null;
    last_daily_push_sent_at: string | null;
  }>) {
    if (playedIds.has(p.id)) continue;
    if (optedOut.has(p.id)) continue;

    if (p.last_daily_push_sent_at) {
      const lastDate = new Date(p.last_daily_push_sent_at).toISOString().split('T')[0];
      if (lastDate === today) continue;
    }

    const localHour = getLocalHour(p.timezone || 'UTC');
    if (localHour < REMINDER_HOUR_MIN || localHour > REMINDER_HOUR_MAX) continue;

    recipients.push(p.id);
  }

  return recipients;
}

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
