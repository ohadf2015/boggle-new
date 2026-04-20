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

  const { data: playedRows, error: challengesErr } = await supabase
    .from('daily_challenges')
    .select('player_id')
    .eq('challenge_date', today)
    .eq('completed', true)
    .in('player_id', userIds);

  if (challengesErr) {
    logger.error?.('PUSH_REMINDER', `challenges query failed: ${challengesErr.message}`);
    return [];
  }

  const playedIds = new Set(
    (playedRows ?? []).map((r: { player_id: string }) => r.player_id)
  );

  const recipients: string[] = [];
  for (const p of profiles as Array<{
    id: string;
    timezone: string | null;
    last_daily_push_sent_at: string | null;
  }>) {
    if (playedIds.has(p.id)) continue;

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
