/**
 * Re-engagement Email Module
 *
 * Sends localized "first letter hint" emails to inactive daily challenge players.
 * Players who haven't played for 5+ days receive a teaser showing the first letter
 * of today's daily word, with 14-day anti-spam intervals.
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

// Re-export template functions for backward compatibility
export {
  generateReengagementEmailHtml,
  getReengagementSubject,
} from './reengagementEmailTemplate';

// ==========================================
// Constants
// ==========================================

const INACTIVITY_DAYS = 5;
const MIN_INTERVAL_DAYS = 14;

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
 * 1. Most recent game language from daily_puzzle_attempts
 * 2. Country code mapping
 * 3. Default 'en'
 */
export async function resolveUserLanguage(
  userId: string,
  countryCode: string | null
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 'en';

  const { data } = await supabase
    .from('daily_puzzle_attempts')
    .select('language')
    .eq('player_id', userId)
    .order('puzzle_date', { ascending: false })
    .limit(1)
    .single();

  if (data?.language) return data.language;

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
 * Get users eligible for re-engagement emails:
 * - daily_email_subscribed = true
 * - No daily_puzzle_attempts in last 5 days
 * - last_reengagement_email_sent_at is null or > 14 days ago
 * - Local time is 7-9 AM
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

    const { data: recentAttempt } = await supabase
      .from('daily_puzzle_attempts')
      .select('id')
      .eq('player_id', profile.id)
      .gte('puzzle_date', inactivityCutoff)
      .limit(1)
      .single();

    if (recentAttempt) continue;

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

// ==========================================
// Send Functions
// ==========================================

/**
 * Send a re-engagement email to a single recipient
 */
export async function sendReengagementEmail(
  recipient: ReengagementRecipient,
  language: string,
  firstLetter: string,
  baseUrl: string
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

  const { generateReengagementEmailHtml } = await import('./reengagementEmailTemplate');
  const { subject, html, text } = generateReengagementEmailHtml({
    recipientName,
    firstLetter,
    language,
    unsubscribeUrl,
    playUrl,
    baseUrl,
  });

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: recipient.email,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      10000,
      'Resend API timed out after 10 seconds'
    );

    if (result.error) {
      console.error(`[Reengagement] Failed to send to ${recipient.email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    await supabase
      .from('profiles')
      .update({ last_reengagement_email_sent_at: new Date().toISOString() })
      .eq('id', recipient.id);

    console.log(`[Reengagement] Sent to ${recipient.email}`);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    console.error(`[Reengagement] Error sending to ${recipient.email}:`, error);
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
  const { subject, html, text } = generateReengagementEmailHtml({
    recipientName,
    firstLetter,
    language,
    unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?token=${'0'.repeat(64)}`,
    playUrl: `${baseUrl}/${locale}/daily`,
    baseUrl,
  });

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `[TEST] ${subject}`,
        html,
        text,
      }),
      10000,
      'Resend API timed out after 10 seconds'
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
