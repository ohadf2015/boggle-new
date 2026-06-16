/**
 * Re-engagement Email Module
 *
 * Sends localized "first letter hint" emails to inactive daily challenge players.
 * Players who haven't played for 11+ days (~1.5 weeks) receive a teaser showing
 * the first letter of today's daily word, with 14-day anti-spam intervals.
 *
 * HTML template: ./reengagementEmailTemplate.ts
 */

import { Resend } from 'resend';
import {
  getSupabaseAdmin,
  withTimeout,
  getTodayDate,
  getLocalHour,
  generateUnsubscribeToken,
  isEmailServiceConfigured,
} from '@/lib/email';
import {
  computeHoursUntilReset,
  computeDaysSinceLastPlay,
} from './reengagementEnrichment';

import logger from '@/backend/utils/logger';

// Re-export template functions for backward compatibility
export {
  generateReengagementEmailHtml,
  getReengagementSubject,
} from './reengagementEmailTemplate';

// ==========================================
// Constants
// ==========================================

const INACTIVITY_DAYS = 14;
const MIN_INTERVAL_DAYS = 30;
const MAX_INACTIVITY_DAYS = 90;

/** Country code -> supported language mapping */
export const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  IL: 'he',
  SE: 'sv',
  JP: 'ja',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
};

/**
 * Live daily-challenge attempt tables. The daily mode was reworked into Word
 * Hunt + Word Wheel; the legacy `daily_puzzle_attempts` table is empty/dead.
 * Every daily-activity read (recipient gating + personalization) routes through
 * this one constant — that single chokepoint is what stops a future table
 * rename from silently starving the recipient pool again.
 */
const DAILY_ATTEMPT_TABLES = ['daily_word_hunt_attempts', 'daily_word_wheel_attempts'] as const;

type DailySupabase = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/** True if the player has a daily attempt on/after `puzzleDateCutoff` (YYYY-MM-DD) in either live daily mode. */
async function hasDailyAttemptSince(
  supabase: DailySupabase,
  playerId: string,
  puzzleDateCutoff: string,
): Promise<boolean> {
  for (const table of DAILY_ATTEMPT_TABLES) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('player_id', playerId)
      .gte('puzzle_date', puzzleDateCutoff)
      .limit(1)
      .maybeSingle();
    if (data) return true;
  }
  return false;
}

/** Most recent daily attempt across both live modes, or null. */
async function getMostRecentDailyAttempt(
  supabase: DailySupabase,
  playerId: string,
): Promise<{ language: string | null; puzzle_date: string } | null> {
  let best: { language: string | null; puzzle_date: string } | null = null;
  for (const table of DAILY_ATTEMPT_TABLES) {
    const { data } = await supabase
      .from(table)
      .select('language, puzzle_date')
      .eq('player_id', playerId)
      .order('puzzle_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as { language?: string | null; puzzle_date?: string } | null;
    if (row?.puzzle_date && (!best || row.puzzle_date > best.puzzle_date)) {
      best = { language: row.language ?? null, puzzle_date: row.puzzle_date };
    }
  }
  return best;
}

// ==========================================
// Types
// ==========================================

export interface ReengagementRecipient {
  id: string;
  email: string;
  display_name: string | null;
  username: string;
  timezone: string | null;
  country_code: string | null;
  email_unsubscribe_token: string | null;
}

// ==========================================
// Language Resolution
// ==========================================

/**
 * Resolve the best language for a user based on:
 * 1. Most recent daily-attempt language (Word Hunt / Word Wheel)
 * 2. Country code mapping
 * 3. Default 'en'
 */
export async function resolveUserLanguage(
  userId: string,
  countryCode: string | null
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 'en';

  const recent = await getMostRecentDailyAttempt(supabase, userId);
  if (recent?.language) return recent.language;

  if (countryCode && COUNTRY_TO_LANGUAGE[countryCode]) {
    return COUNTRY_TO_LANGUAGE[countryCode];
  }

  return 'en';
}

// ==========================================
// First Letter Fetch
// ==========================================

/**
 * Get the first letter of today's daily word for a given language
 */
export async function getFirstLetterForLanguage(
  language: string
): Promise<{ letter: string; word: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const today = getTodayDate();

  const { data, error } = await supabase
    .from('daily_target_words')
    .select('target_word, override_word')
    .eq('puzzle_date', today)
    .eq('language', language)
    .single();

  if (error || !data) return null;

  const word = data.override_word || data.target_word;
  if (!word) return null;

  return {
    letter: word.charAt(0).toUpperCase(),
    word,
  };
}

// ==========================================
// Recipient Fetching
// ==========================================

/**
 * Get users eligible for re-engagement emails. Conservative gating to avoid
 * nagging users who don't want it:
 *   - daily_email_subscribed = true
 *   - No daily_puzzle_attempts in last INACTIVITY_DAYS
 *   - HAS played daily at least once ever (skip never-played sign-ups)
 *   - Most recent play within MAX_INACTIVITY_DAYS (give up on long-gone users)
 *   - last_reengagement_email_sent_at null or > MIN_INTERVAL_DAYS ago
 *   - Local time 7-9 AM
 */
export async function getReengagementRecipients(): Promise<ReengagementRecipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MIN_INTERVAL_DAYS);
  const antiSpamCutoff = cutoffDate.toISOString();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      username,
      timezone,
      country_code,
      email_unsubscribe_token,
      last_reengagement_email_sent_at
    `)
    .eq('daily_email_subscribed', true);

  if (error || !profiles?.length) return [];

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) return [];

  const emailMap = new Map<string, string>();
  authUsers.users.forEach((user: { id: string; email?: string }) => {
    if (user.email) emailMap.set(user.id, user.email);
  });

  const inactivityDate = new Date();
  inactivityDate.setDate(inactivityDate.getDate() - INACTIVITY_DAYS);
  const inactivityCutoff = inactivityDate.toISOString().split('T')[0];

  const giveUpDate = new Date();
  giveUpDate.setDate(giveUpDate.getDate() - MAX_INACTIVITY_DAYS);
  const giveUpCutoff = giveUpDate.toISOString().split('T')[0];

  const recipients: ReengagementRecipient[] = [];

  for (const profile of profiles) {
    const email = emailMap.get(profile.id);
    if (!email) continue;

    if (profile.last_reengagement_email_sent_at) {
      const lastSent = new Date(profile.last_reengagement_email_sent_at);
      if (lastSent.toISOString() > antiSpamCutoff) continue;
    }

    const userTimezone = profile.timezone || 'UTC';
    const localHour = getLocalHour(userTimezone);
    if (localHour < 7 || localHour > 9) continue;

    // Recent activity check — skip users who played the daily within window.
    const playedDailyRecently = await hasDailyAttemptSince(supabase, profile.id, inactivityCutoff);
    if (playedDailyRecently) continue;

    // Cross-mode activity check — engagementManager writes last_played_at on
    // every game (MP, SP, brain drills, party). If the user played anything
    // recently, don't nag them to come back.
    const inactivityCutoffIso = inactivityDate.toISOString();
    const { data: recentAnyGame } = await supabase
      .from('player_engagement')
      .select('last_played_at')
      .eq('player_id', profile.id)
      .gte('last_played_at', inactivityCutoffIso)
      .limit(1)
      .maybeSingle();

    if (recentAnyGame) continue;

    // Engagement window — must have played at least once within last MAX_INACTIVITY_DAYS.
    // Skips two cohorts we shouldn't nag: never-played sign-ups + long-gone users.
    const playedDailyInWindow = await hasDailyAttemptSince(supabase, profile.id, giveUpCutoff);
    if (!playedDailyInWindow) continue;

    recipients.push({
      id: profile.id,
      email,
      display_name: profile.display_name,
      username: profile.username,
      timezone: profile.timezone,
      country_code: profile.country_code ?? null,
      email_unsubscribe_token: profile.email_unsubscribe_token,
    });
  }

  return recipients;
}

/**
 * Run one full re-engagement email batch: fetch eligible recipients, resolve
 * each one's language + today's first-letter hint, send. Shared by BOTH the
 * node-cron scheduler and the BullMQ worker so the two paths can never drift —
 * a job missing from one path is exactly what silently disabled sends before.
 */
export async function runReengagementEmailBatch(): Promise<{
  sent: number;
  failed: number;
  total: number;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';

  const recipients = await getReengagementRecipients();
  if (recipients.length === 0) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;

  // Sequential to respect Resend rate limits.
  for (const recipient of recipients) {
    const language = await resolveUserLanguage(recipient.id, recipient.country_code);
    let letterData = await getFirstLetterForLanguage(language);
    if (!letterData) letterData = await getFirstLetterForLanguage('en');
    if (!letterData) {
      failed++;
      continue;
    }

    const result = await sendReengagementEmail(
      recipient,
      language,
      letterData.letter,
      baseUrl,
      letterData.word.length,
    );
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed, total: recipients.length };
}

// ==========================================
// Send Functions
// ==========================================

// ==========================================
// Enrichment Queries
// ==========================================

/**
 * Cache module-level: aggregate count of distinct players who completed
 * today's daily puzzle, keyed per `${language}-${puzzleDate}`. Refreshed
 * on first call per cron run (cron is hourly; cache TTL is implicit via
 * the date-keyed key — rolls over at UTC midnight).
 */
const playersTodayCache = new Map<string, number>();

async function getPlayersToday(language: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const puzzleDate = getTodayDate();
  const cacheKey = `${language}-${puzzleDate}`;
  if (playersTodayCache.has(cacheKey)) return playersTodayCache.get(cacheKey) ?? null;

  // count of attempts is a useful approximation; one row per player per puzzle.
  // Sum across both live daily modes (Word Hunt + Word Wheel).
  let total = 0;
  let any = false;
  for (const table of DAILY_ATTEMPT_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('puzzle_date', puzzleDate)
      .eq('language', language);
    if (!error && count != null) {
      total += count;
      any = true;
    }
  }

  if (!any) return null;
  playersTodayCache.set(cacheKey, total);
  return total;
}

async function getLastPlayedDate(playerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const recent = await getMostRecentDailyAttempt(supabase, playerId);
  return recent?.puzzle_date ?? null;
}

/**
 * Send a re-engagement email to a single recipient
 */
export async function sendReengagementEmail(
  recipient: ReengagementRecipient,
  language: string,
  firstLetter: string,
  baseUrl: string,
  wordLength?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailServiceConfigured()) {
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  let unsubscribeToken = recipient.email_unsubscribe_token;
  if (!unsubscribeToken) {
    unsubscribeToken = generateUnsubscribeToken();
    await supabase
      .from('profiles')
      .update({ email_unsubscribe_token: unsubscribeToken })
      .eq('id', recipient.id);
  }

  const locale = language === 'he' ? 'he' : language === 'sv' ? 'sv' : language === 'ja' ? 'ja' : language === 'es' ? 'es' : 'en';
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
  const playUrl = `${baseUrl}/${locale}/daily`;
  const recipientName = recipient.display_name || recipient.username || 'Word Hunter';

  // Enrich with personalization data — each helper is fault-tolerant and
  // returns null on failure; component soft-gates each chip independently.
  const [lastPlayed, playersToday] = await Promise.all([
    getLastPlayedDate(recipient.id),
    getPlayersToday(language),
  ]);
  const daysSinceLastPlay = computeDaysSinceLastPlay(lastPlayed) ?? undefined;
  const hoursUntilReset = computeHoursUntilReset(recipient.timezone || 'UTC');

  const { generateReengagementEmailHtml } = await import('./reengagementEmailTemplate');
  const { subject, html } = await withTimeout(
    generateReengagementEmailHtml({
      recipientName,
      firstLetter,
      language,
      unsubscribeUrl,
      playUrl,
      baseUrl,
      wordLength,
      daysSinceLastPlay,
      playersToday: playersToday ?? undefined,
      hoursUntilReset,
    }),
    30000,
    'Email render timed out after 30 seconds'
  );

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: recipient.email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      20000,
      'Resend API timed out after 20 seconds'
    );

    if (result.error) {
      logger.error('EMAIL', `Failed to send to ${recipient.email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    await supabase
      .from('profiles')
      .update({ last_reengagement_email_sent_at: new Date().toISOString() })
      .eq('id', recipient.id);

    logger.info('EMAIL', `Reengagement sent to ${recipient.email}`);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    logger.error('EMAIL', `Reengagement error sending to ${recipient.email}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a test re-engagement email (for admin testing)
 */
export async function sendTestReengagementEmail(
  toEmail: string,
  recipientName: string = 'Test User',
  language: string = 'en',
  firstLetter: string = 'T'
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailServiceConfigured()) {
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const locale = language === 'he' ? 'he' : language === 'sv' ? 'sv' : language === 'ja' ? 'ja' : language === 'es' ? 'es' : 'en';

  const { generateReengagementEmailHtml } = await import('./reengagementEmailTemplate');
  const { subject, html } = await withTimeout(
    generateReengagementEmailHtml({
      recipientName,
      firstLetter,
      language,
      unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?token=${'0'.repeat(64)}`,
      playUrl: `${baseUrl}/${locale}/daily`,
      baseUrl,
    }),
    30000,
    'Email render timed out after 30 seconds'
  );

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `[TEST] ${subject}`,
        html,
      }),
      20000,
      'Resend API timed out after 20 seconds'
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}
