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
  text: string;
}

export async function generateAndroidBetaLaunchHtml(
  params: RenderParams
): Promise<RenderedEmail> {
  const subject = getAndroidBetaLaunchSubject(
    params.language,
    params.recipientName
  );

  const [html, text] = await Promise.all([
    render(AndroidBetaLaunchEmail(params)),
    render(AndroidBetaLaunchEmail(params), { plainText: true }),
  ]);

  return { subject, html, text };
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

  const { subject, html, text } = await generateAndroidBetaLaunchHtml({
    recipientName,
    language,
    unsubscribeUrl,
    playUrl: PLAY_STORE_URL,
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
  let displayName: string | null = null;
  let username: string | null = null;
  let preferredLanguage: string | null = null;
  let unsubscribeToken: string | null = null;
  let resolvedEmail: string | null = null;

  if (isEmail) {
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();
    if (authError) {
      return { success: false, error: 'Failed to look up auth users' };
    }
    const match = authUsers.users.find(
      (u: { id: string; email?: string }) =>
        u.email?.toLowerCase() === playerIdentifier.toLowerCase()
    );
    if (!match) {
      return {
        success: false,
        error: `No user found with email ${playerIdentifier}`,
      };
    }
    profileId = match.id;
    resolvedEmail = match.email ?? null;
  } else {
    const { data: profileByName } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', playerIdentifier)
      .single();
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, language, email_unsubscribe_token')
    .eq('id', profileId)
    .single();

  if (profile) {
    displayName = profile.display_name ?? null;
    username = profile.username ?? null;
    preferredLanguage = profile.language ?? null;
    unsubscribeToken = profile.email_unsubscribe_token ?? null;
  }

  if (!resolvedEmail) {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const match = authUsers?.users.find(
      (u: { id: string; email?: string }) => u.id === profileId
    );
    resolvedEmail = match?.email ?? null;
  }

  if (!resolvedEmail) {
    return { success: false, error: 'Player has no email address' };
  }

  if (!unsubscribeToken) {
    unsubscribeToken = generateUnsubscribeToken();
    await supabase
      .from('profiles')
      .update({ email_unsubscribe_token: unsubscribeToken })
      .eq('id', profileId);
  }

  const language = preferredLanguage || 'en';
  const baseUrl = resolveBaseUrl();
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
  const recipientName = displayName || username || 'Word Hunter';

  const { subject, html, text } = await generateAndroidBetaLaunchHtml({
    recipientName,
    language,
    unsubscribeUrl,
    playUrl: PLAY_STORE_URL,
  });

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: resolvedEmail,
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
      logger.error(
        'EMAIL',
        `Failed to send android beta launch to ${resolvedEmail}:`,
        result.error
      );
      return { success: false, error: result.error.message };
    }

    logger.info('EMAIL', `Android beta launch sent to ${resolvedEmail}`);
    return { success: true, sentTo: resolvedEmail };
  } catch (err) {
    const error = err as Error;
    logger.error(
      'EMAIL',
      `Android beta launch error to ${resolvedEmail}:`,
      error
    );
    return { success: false, error: error.message };
  }
}
