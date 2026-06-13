/**
 * Welcome Email to New Users
 *
 * Idempotent, new-signups-only send library using atomic database claims.
 * Prevents double-sends through 48h creation window check + atomic update guard.
 */

import { Resend } from 'resend';
import { render } from '@react-email/components';

import logger from '@/backend/utils/logger';
import {
  getSupabaseAdmin,
  isEmailServiceConfigured,
  generateUnsubscribeToken,
  getLocaleFromCountry,
  withTimeout,
} from '@/lib/email';
import WelcomeEmail, { getWelcomeSubject } from '@/emails/welcome';
import { getWelcomeEmailModes } from '@/lib/email/welcomeModes';

/**
 * Get or create Resend client. Lazy initialization to support testing.
 * Exported for testing purposes.
 */
export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export interface SendWelcomeEmailResult {
  sent: boolean;
  reason?: string;
  language?: string;
}

/**
 * Send welcome email to a user (idempotent, new-signups-only).
 *
 * Atomically claims the user in the profiles table (sets welcome_email_sent_at)
 * within a 48h creation window, ensuring:
 * 1. Only new users (created within 48h) receive the email
 * 2. Each user gets at most one welcome email (idempotent)
 * 3. No double-sends on reload or concurrent calls
 *
 * @param userId - Supabase auth user ID
 * @param opts.locale - Optional language override ('en'|'he'|'sv'|'ja'|'es')
 * @param opts.email - Optional email (skips auth.getUser lookup)
 * @param opts.baseUrl - Optional base URL for links (defaults to NEXT_PUBLIC_APP_URL)
 * @returns { sent: true, language } on success, { sent: false, reason } on failure
 */
export async function sendWelcomeEmailToUser(
  userId: string,
  opts?: { locale?: string; email?: string; baseUrl?: string }
): Promise<SendWelcomeEmailResult> {
  try {
    // Step 1: Check email service configuration
    if (!isEmailServiceConfigured()) {
      logger.info('EMAIL', 'Welcome email service not configured');
      return { sent: false, reason: 'email_service_unconfigured' };
    }

    // Step 2: Get Supabase admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error('EMAIL', 'Supabase admin client unavailable');
      return { sent: false, reason: 'no_db' };
    }

    // Step 3: Atomic claim (idempotency guard + new-signups-only)
    // Only update rows where welcome_email_sent_at is null AND created within 48h
    const nowIso = new Date().toISOString();
    const cutoffIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: claimed, error: claimErr } = await supabase
      .from('profiles')
      .update({ welcome_email_sent_at: nowIso })
      .eq('id', userId)
      .is('welcome_email_sent_at', null)
      .gt('created_at', cutoffIso)
      .select('country_code, username, display_name, email_unsubscribe_token');

    if (claimErr) {
      logger.error('EMAIL', 'Welcome claim error:', claimErr);
      return { sent: false, reason: 'claim_error' };
    }

    if (!claimed || claimed.length === 0) {
      logger.info(
        'EMAIL',
        `Welcome email not sent: user ${userId} already sent or not new`
      );
      return { sent: false, reason: 'already_sent_or_not_new' };
    }

    const profile = claimed[0];

    // Step 4: Resolve email address
    let email = opts?.email;
    if (!email) {
      const { data } = await supabase.auth.admin.getUserById(userId);
      email = data?.user?.email ?? undefined;
    }

    if (!email) {
      logger.error('EMAIL', `Welcome email: no email for user ${userId}`);
      // Revert the claim since we can't proceed
      await supabase
        .from('profiles')
        .update({ welcome_email_sent_at: null })
        .eq('id', userId);
      return { sent: false, reason: 'no_email' };
    }

    // Step 5: Determine language
    const language = resolveLang(opts?.locale, profile.country_code);

    // Step 6: Ensure unsubscribe token
    let token = profile.email_unsubscribe_token;
    if (!token) {
      token = generateUnsubscribeToken();
      await supabase
        .from('profiles')
        .update({ email_unsubscribe_token: token })
        .eq('id', userId);
    }

    // Step 7: Build URLs
    const baseUrl =
      opts?.baseUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://www.lexiclash.live';
    const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${token}`;
    const playUrl = `${baseUrl}/${language}`;
    const videoUrl = `${baseUrl}/${language}`;

    // Step 8: Resolve recipient name
    const recipientName =
      profile.display_name || profile.username || 'there';

    // Step 9: Render email
    const subject = getWelcomeSubject(language, recipientName);
    // Dynamic public-mode grid — derived from the shared MODE_META registry so
    // the email lists every all-players mode with its cube art and link.
    const modes = getWelcomeEmailModes(language, baseUrl);
    const html = await render(
      WelcomeEmail({
        recipientName,
        language,
        unsubscribeUrl,
        playUrl,
        videoUrl,
        baseUrl,
        modes,
      })
    );
    const text = await render(
      WelcomeEmail({
        recipientName,
        language,
        unsubscribeUrl,
        playUrl,
        videoUrl,
        baseUrl,
        modes,
      }),
      { plainText: true }
    );

    // Step 10: Send via Resend with timeout
    const resendClient = getResendClient();
    if (!resendClient) {
      logger.error('EMAIL', 'Resend client not initialized');
      await revertClaim(supabase, userId);
      return { sent: false, reason: 'resend_unavailable' };
    }

    const from = process.env.RESEND_FROM_EMAIL || 'noreply@lexiclash.live';

    const sendResult = await withTimeout(
      resendClient.emails.send({
        from,
        to: email,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      10000,
      'Welcome email send timeout'
    );

    if (sendResult.error || !sendResult.data?.id) {
      logger.error(
        'EMAIL',
        'Welcome send failed:',
        sendResult.error || 'no send ID'
      );
      // Revert the claim so user can retry
      await revertClaim(supabase, userId);
      return {
        sent: false,
        reason: 'send_failed',
      };
    }

    logger.info(
      'EMAIL',
      `Welcome email sent to ${email} (lang: ${language}, send_id: ${sendResult.data.id})`
    );
    return { sent: true, language };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('EMAIL', `Welcome email exception: ${msg}`);

    // Best-effort revert on exception
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await revertClaim(supabase, userId).catch(() => {
        // Silence revert errors
      });
    }

    return { sent: false, reason: 'exception' };
  }
}

/**
 * Resolve language: prefer explicit locale, fall back to country, default to en
 */
function resolveLang(
  locale: string | undefined,
  countryCode: string | null
): string {
  if (locale && SUPPORTED_LANGUAGES.includes(locale as any)) {
    return locale;
  }
  return getLocaleFromCountry(countryCode);
}

/**
 * Send a TEST welcome email (admin tooling).
 *
 * Bypasses the idempotency claim + 48h new-signup window of
 * `sendWelcomeEmailToUser` — renders the real template and sends straight to
 * the given address with a `[TEST]` subject prefix. No DB writes.
 */
export async function sendTestWelcomeEmail(
  toEmail: string,
  recipientName: string = 'Test User',
  language: string = 'en',
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailServiceConfigured()) {
    return { success: false, error: 'Email service not configured' };
  }

  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Resend client not initialized' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@lexiclash.live';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';

  try {
    const subject = getWelcomeSubject(language, recipientName);
    const html = await withTimeout(
      render(
        WelcomeEmail({
          recipientName,
          language,
          unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?token=${'0'.repeat(64)}`,
          playUrl: `${baseUrl}/${locale}`,
          videoUrl: `${baseUrl}/${locale}`,
          baseUrl,
          modes: getWelcomeEmailModes(language, baseUrl),
        }),
      ),
      30000,
      'Welcome email render timed out after 30 seconds',
    );

    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `[TEST] ${subject}`,
        html,
      }),
      20000,
      'Resend API timed out after 20 seconds',
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

/**
 * Revert the atomic claim by setting welcome_email_sent_at back to null
 */
async function revertClaim(supabase: any, userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ welcome_email_sent_at: null })
    .eq('id', userId);

  if (error) {
    logger.error('EMAIL', `Failed to revert welcome claim for ${userId}:`, error);
  }
}
