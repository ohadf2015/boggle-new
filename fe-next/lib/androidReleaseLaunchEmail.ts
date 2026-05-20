/**
 * Android Release Launch Email — render + send helpers for the public
 * "LexiClash is now on Google Play" announcement.
 *
 * Mirrors lib/androidBetaLaunchEmail.ts so the admin panel treats it as
 * "just another email type". Two real-send entry points:
 *   - sendAndroidReleaseLaunchToPlayer(identifier)  → single player (admin)
 *   - sendAndroidReleaseLaunchToRecipient(recipient) → pre-resolved, used by
 *     the bulk "send to all users" loop (avoids re-querying per recipient).
 *
 * The heavy template renders ONCE per language (sentinel cache); per-recipient
 * we only string-replace name + unsubscribe URL. Critical for a bulk blast —
 * rendering the full tree per email would blow the serverless time budget.
 */

import { Resend } from 'resend';
import { render } from '@react-email/components';
import AndroidReleaseLaunchEmail, {
  getAndroidReleaseLaunchSubject,
  HERO_IMAGE,
} from '@/emails/androidReleaseLaunch';
import {
  getSupabaseAdmin,
  withTimeout,
  generateUnsubscribeToken,
  isEmailServiceConfigured,
} from '@/lib/email';
import logger from '@/backend/utils/logger';

export { getAndroidReleaseLaunchSubject, HERO_IMAGE };

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=live.lexiclash.app';

interface RenderParams {
  recipientName: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
}

interface RenderedEmail {
  subject: string;
  html: string;
}

// Sentinels survive React render unchanged (plain ASCII, no special chars).
const NAME_SENTINEL = '__LEXI_RECIPIENT_NAME__';
const UNSUB_SENTINEL = 'https://__lexi_unsubscribe_sentinel__/';

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => htmlEntities[c]);
}

const renderCacheByLanguage = new Map<string, Promise<string>>();

function getCachedTemplate(language: string, playUrl: string): Promise<string> {
  const existing = renderCacheByLanguage.get(language);
  if (existing) return existing;

  const p = render(
    AndroidReleaseLaunchEmail({
      recipientName: NAME_SENTINEL,
      language,
      unsubscribeUrl: UNSUB_SENTINEL,
      playUrl,
    })
  ).catch((err) => {
    renderCacheByLanguage.delete(language);
    throw err;
  });

  renderCacheByLanguage.set(language, p);
  return p;
}

export async function generateAndroidReleaseLaunchHtml(
  params: RenderParams
): Promise<RenderedEmail> {
  const subject = getAndroidReleaseLaunchSubject(
    params.language,
    params.recipientName
  );

  const template = await getCachedTemplate(params.language, params.playUrl);
  const html = template
    .split(NAME_SENTINEL)
    .join(htmlEscape(params.recipientName))
    .split(UNSUB_SENTINEL)
    .join(params.unsubscribeUrl);

  return { subject, html };
}

function resolveBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
}

/**
 * Admin [TEST] send — prepends [TEST] and uses a fake unsubscribe token.
 * For operator preview-to-self before a real blast.
 */
export async function sendTestAndroidReleaseLaunch(
  toEmail: string,
  recipientName: string = 'Test User',
  language: string = 'en'
): Promise<{ success: boolean; error?: string }> {
  const t0 = Date.now();
  if (!isEmailServiceConfigured()) {
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  const baseUrl = resolveBaseUrl();
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${'0'.repeat(64)}`;

  const { subject, html } = await withTimeout(
    generateAndroidReleaseLaunchHtml({
      recipientName,
      language,
      unsubscribeUrl,
      playUrl: PLAY_STORE_URL,
    }),
    8000,
    'Email render timed out after 8 seconds'
  );

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `[TEST] ${subject}`,
        html,
      }),
      15000,
      'Resend API timed out after 15 seconds'
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err) {
    logger.error(
      'EMAIL',
      `[android-release-test] failed after ${Date.now() - t0}ms: ${(err as Error).message}`
    );
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Real send to a pre-resolved recipient. Used by the bulk "send to all users"
 * loop, which already resolved email + language + unsubscribe token. No [TEST].
 */
export async function sendAndroidReleaseLaunchToRecipient(params: {
  email: string;
  recipientName: string;
  language: string;
  unsubscribeUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isEmailServiceConfigured()) {
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  try {
    const { subject, html } = await withTimeout(
      generateAndroidReleaseLaunchHtml({
        recipientName: params.recipientName,
        language: params.language,
        unsubscribeUrl: params.unsubscribeUrl,
        playUrl: PLAY_STORE_URL,
      }),
      8000,
      'Email render timed out after 8 seconds'
    );

    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: params.email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      15000,
      'Resend API timed out after 15 seconds'
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Real send to a specific player — by email or username.
 * Auto-detects language from profile. Used by admin "Send to Player". No [TEST].
 */
export async function sendAndroidReleaseLaunchToPlayer(
  playerIdentifier: string
): Promise<{ success: boolean; error?: string; sentTo?: string }> {
  const t0 = Date.now();
  let currentStep = 'init';
  const stepFail = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    const elapsed = Date.now() - t0;
    logger.error(
      'EMAIL',
      `[android-release-player] step=${currentStep} failed after ${elapsed}ms: ${msg}`
    );
    return {
      success: false as const,
      error: `step=${currentStep} elapsed=${elapsed}ms: ${msg}`,
    };
  };

  try {
    if (!isEmailServiceConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
    }

    const isEmail = playerIdentifier.includes('@');
    let profileId: string | null = null;
    let resolvedEmail: string | null = null;

    if (isEmail) {
      currentStep = 'supabase-email-lookup';
      const target = playerIdentifier.toLowerCase();
      const { data: viewRow, error: viewError } = await withTimeout(
        Promise.resolve(
          supabase
            .from('auth_users_view')
            .select('id, email')
            .eq('email', target)
            .maybeSingle()
        ),
        5000,
        'Supabase email lookup timed out after 5 seconds'
      );

      if (viewError || !viewRow) {
        return { success: false, error: `No user found with email ${playerIdentifier}` };
      }
      profileId = viewRow.id;
      resolvedEmail = viewRow.email ?? null;
    } else {
      currentStep = 'supabase-username-lookup';
      const { data: profileByName } = await withTimeout(
        Promise.resolve(
          supabase
            .from('profiles')
            .select('id')
            .eq('username', playerIdentifier)
            .maybeSingle()
        ),
        5000,
        'Supabase username lookup timed out after 5 seconds'
      );
      if (!profileByName) {
        return { success: false, error: `No user found with username ${playerIdentifier}` };
      }
      profileId = profileByName.id;
    }

    if (!profileId) {
      return { success: false, error: 'Could not resolve profile' };
    }

    currentStep = 'supabase-profile-email';
    const profilePromise = supabase
      .from('profiles')
      .select('display_name, username, language, email_unsubscribe_token')
      .eq('id', profileId)
      .maybeSingle();

    const emailPromise = resolvedEmail
      ? Promise.resolve({ data: { email: resolvedEmail }, error: null })
      : supabase
          .from('auth_users_view')
          .select('email')
          .eq('id', profileId)
          .maybeSingle();

    const [{ data: profile }, { data: emailRow, error: emailErr }] = await withTimeout(
      Promise.all([profilePromise, emailPromise]),
      5000,
      'Supabase profile+email lookup timed out after 5 seconds'
    );

    if (emailErr) {
      return { success: false, error: `Email lookup failed: ${emailErr.message}` };
    }
    resolvedEmail = emailRow?.email ?? resolvedEmail;

    if (!resolvedEmail) {
      return { success: false, error: 'Player has no email address' };
    }

    const displayName = profile?.display_name ?? null;
    const username = profile?.username ?? null;
    const preferredLanguage = profile?.language ?? null;
    let unsubscribeToken = profile?.email_unsubscribe_token ?? null;

    if (!unsubscribeToken) {
      unsubscribeToken = generateUnsubscribeToken();
      // Fire-and-forget: don't block send on token persistence
      void supabase
        .from('profiles')
        .update({ email_unsubscribe_token: unsubscribeToken })
        .eq('id', profileId)
        .then(({ error }) => {
          if (error) {
            logger.warn(
              'EMAIL',
              `[android-release-player] unsubscribe-token persist failed: ${error.message}`
            );
          }
        });
    }

    const language = preferredLanguage || 'en';
    const baseUrl = resolveBaseUrl();
    const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
    const recipientName = displayName || username || 'Word Hunter';

    currentStep = 'render';
    const { subject, html } = await withTimeout(
      generateAndroidReleaseLaunchHtml({
        recipientName,
        language,
        unsubscribeUrl,
        playUrl: PLAY_STORE_URL,
      }),
      8000,
      'Email render timed out after 8 seconds'
    );

    currentStep = 'resend-send';
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: resolvedEmail,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      15000,
      'Resend API timed out after 15 seconds'
    );

    if (result.error) {
      logger.error(
        'EMAIL',
        `Failed to send android release launch to ${resolvedEmail}:`,
        result.error
      );
      return { success: false, error: `step=resend-send resend-error: ${result.error.message}` };
    }

    logger.info('EMAIL', `Android release launch sent to ${resolvedEmail}`);
    return { success: true, sentTo: resolvedEmail };
  } catch (err) {
    return stepFail(err);
  }
}
