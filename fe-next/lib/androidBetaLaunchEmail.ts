/**
 * Android Beta Launch Email — render + send helpers.
 * Mirrors lib/gameModeAnnouncementEmail.ts so the admin panel treats
 * it as "just another email type".
 */

import { Resend } from 'resend';
import { render } from '@react-email/components';
import AndroidBetaLaunchEmail, {
  getAndroidBetaLaunchSubject,
} from '@/emails/androidBetaLaunch';
import {
  getSupabaseAdmin,
  withTimeout,
  generateUnsubscribeToken,
  isEmailServiceConfigured,
} from '@/lib/email';
import logger from '@/backend/utils/logger';

export { getAndroidBetaLaunchSubject };

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
// Replaced post-render so we render the heavy 700+ line template ONCE per language
// instead of per request. Avoids 30-60s sync render hangs in admin send path.
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
    AndroidBetaLaunchEmail({
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

export async function generateAndroidBetaLaunchHtml(
  params: RenderParams
): Promise<RenderedEmail> {
  const subject = getAndroidBetaLaunchSubject(
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
 */
export async function sendTestAndroidBetaLaunch(
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

  logger.info('EMAIL', `[android-beta-test] render-start lang=${language} +${Date.now() - t0}ms`);
  const renderStart = Date.now();
  const { subject, html } = await withTimeout(
    generateAndroidBetaLaunchHtml({
      recipientName,
      language,
      unsubscribeUrl,
      playUrl: PLAY_STORE_URL,
    }),
    8000,
    'Email render timed out after 8 seconds'
  );
  logger.info(
    'EMAIL',
    `[android-beta-test] render-done html=${html.length}B in ${Date.now() - renderStart}ms`
  );

  try {
    logger.info('EMAIL', `[android-beta-test] resend-send-start to=${toEmail} +${Date.now() - t0}ms`);
    const sendStart = Date.now();
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
    logger.info(
      'EMAIL',
      `[android-beta-test] resend-send-done in ${Date.now() - sendStart}ms total=${Date.now() - t0}ms`
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err) {
    logger.error(
      'EMAIL',
      `[android-beta-test] failed after ${Date.now() - t0}ms: ${(err as Error).message}`
    );
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Real send to a specific player — by email or username.
 * Auto-detects language from profile. Used by admin "Send to Player".
 */
export async function sendAndroidBetaLaunchToPlayer(
  playerIdentifier: string
): Promise<{ success: boolean; error?: string; sentTo?: string }> {
  const t0 = Date.now();
  let currentStep = 'init';
  const stepFail = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    const elapsed = Date.now() - t0;
    logger.error(
      'EMAIL',
      `[android-beta-player] step=${currentStep} failed after ${elapsed}ms: ${msg}`
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

  logger.info('EMAIL', `[android-beta-player] lookup-start identifier=${playerIdentifier} +${Date.now() - t0}ms`);
  const lookupStart = Date.now();

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
      return {
        success: false,
        error: `No user found with email ${playerIdentifier}`,
      };
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
      return {
        success: false,
        error: `No user found with username ${playerIdentifier}`,
      };
    }
    profileId = profileByName.id;
  }

  if (!profileId) {
    return { success: false, error: 'Could not resolve profile' };
  }

  currentStep = 'supabase-profile-email';
  // Parallelize: profile details + email (if not already resolved via view)
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

  logger.info(
    'EMAIL',
    `[android-beta-player] lookup-done in ${Date.now() - lookupStart}ms`
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
            `[android-beta-player] unsubscribe-token persist failed: ${error.message}`
          );
        }
      });
  }

  const language = preferredLanguage || 'en';
  const baseUrl = resolveBaseUrl();
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
  const recipientName = displayName || username || 'Word Hunter';

  currentStep = 'render';
  logger.info('EMAIL', `[android-beta-player] render-start lang=${language} +${Date.now() - t0}ms`);
  const renderStart = Date.now();
  const { subject, html } = await withTimeout(
    generateAndroidBetaLaunchHtml({
      recipientName,
      language,
      unsubscribeUrl,
      playUrl: PLAY_STORE_URL,
    }),
    8000,
    'Email render timed out after 8 seconds'
  );
  logger.info(
    'EMAIL',
    `[android-beta-player] render-done html=${html.length}B in ${Date.now() - renderStart}ms`
  );

  currentStep = 'resend-send';
  logger.info('EMAIL', `[android-beta-player] resend-send-start to=${resolvedEmail} +${Date.now() - t0}ms`);
  const sendStart = Date.now();
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
  logger.info(
    'EMAIL',
    `[android-beta-player] resend-send-done in ${Date.now() - sendStart}ms total=${Date.now() - t0}ms`
  );

  if (result.error) {
    logger.error(
      'EMAIL',
      `Failed to send android beta launch to ${resolvedEmail}:`,
      result.error
    );
    return { success: false, error: `step=resend-send resend-error: ${result.error.message}` };
  }

  logger.info('EMAIL', `Android beta launch sent to ${resolvedEmail}`);
  return { success: true, sentTo: resolvedEmail };
  } catch (err) {
    return stepFail(err);
  }
}
