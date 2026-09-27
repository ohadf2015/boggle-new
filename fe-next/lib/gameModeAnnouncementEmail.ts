/**
 * Game Mode Announcement Email
 *
 * Renders + sends the reusable game-mode announcement template
 * (emails/gameModeAnnouncement.tsx). Mirrors the shape of
 * reengagementEmailTemplate.ts + reengagementEmail.ts so the admin
 * UI can treat it as "just another email type".
 *
 * Currently wired for Blast; add modes by extending MODE_PRESETS in
 * the component file — no changes needed here.
 */

import { Resend } from 'resend';
import { render } from '@react-email/components';
import GameModeAnnouncementEmail, {
  getGameModeAnnouncementSubject,
  type GameModeKey,
} from '@/emails/gameModeAnnouncement';
import {
  getSupabaseAdmin,
  withTimeout,
  generateUnsubscribeToken,
  isEmailServiceConfigured,
} from '@/lib/email';
import logger from '@/backend/utils/logger';

export type { GameModeKey } from '@/emails/gameModeAnnouncement';
export { getGameModeAnnouncementSubject };

// ==========================================
// Types
// ==========================================

interface RenderParams {
  recipientName: string;
  language: string;
  mode: GameModeKey;
  unsubscribeUrl: string;
  playUrl: string;
}

interface RenderedEmail {
  subject: string;
  html: string;
}

// ==========================================
// Template Renderer
// ==========================================

/**
 * Render the game mode announcement email to HTML + plain text.
 * Subject line is derived from the language + recipient name.
 */
export async function generateGameModeAnnouncementHtml(
  params: RenderParams
): Promise<RenderedEmail> {
  const { recipientName, language, mode, unsubscribeUrl, playUrl } = params;

  const subject = getGameModeAnnouncementSubject(mode, language, recipientName);

  const props = { recipientName, language, mode, unsubscribeUrl, playUrl };

  const html = await render(GameModeAnnouncementEmail(props));

  return { subject, html };
}

// ==========================================
// URL helpers
// ==========================================

function resolveBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
}

function resolveLocale(language: string): string {
  if (language === 'he') return 'he';
  if (language === 'sv') return 'sv';
  if (language === 'ja') return 'ja';
  if (language === 'es') return 'es';
  return 'en';
}

function resolvePlayPath(mode: GameModeKey, locale: string): string {
  // Each mode lives on its own route — keep the map local so adding a
  // mode stays a one-liner.
  switch (mode) {
    case 'blast':
      return `/${locale}/blast`;
    case 'wordhunt':
      return `/${locale}/wordhunt`;
    case 'adventure':
      return `/${locale}/adventure`;
  }
}

// ==========================================
// Send — Test (admin)
// ==========================================

/**
 * Send a [TEST]-prefixed game mode announcement to an arbitrary inbox.
 * Used by the admin EmailTestPanel.
 */
export async function sendTestGameModeAnnouncement(
  toEmail: string,
  recipientName: string = 'Test User',
  language: string = 'en',
  mode: GameModeKey = 'blast'
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
  const locale = resolveLocale(language);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${'0'.repeat(64)}`;
  const playUrl = `${baseUrl}${resolvePlayPath(mode, locale)}`;

  const { subject, html } = await withTimeout(
    generateGameModeAnnouncementHtml({
      recipientName,
      language,
      mode,
      unsubscribeUrl,
      playUrl,
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

// ==========================================
// Send — Real (to a specific player)
// ==========================================

/**
 * Send a real (non-test) game mode announcement to a player looked up
 * by email or username. Auto-detects the player's preferred language
 * from their profile. Used by the admin "Send to Player" flow.
 */
export async function sendGameModeAnnouncementToPlayer(
  playerIdentifier: string,
  mode: GameModeKey = 'blast'
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

  // Look up the profile. Identifier is either an email or a username.
  const isEmail = playerIdentifier.includes('@');

  let profileId: string | null = null;
  let displayName: string | null = null;
  let username: string | null = null;
  let preferredLanguage: string | null = null;
  let unsubscribeToken: string | null = null;
  let resolvedEmail: string | null = null;

  if (isEmail) {
    const target = playerIdentifier.toLowerCase();
    const { data: viewRow, error: viewError } = await supabase
      .from('auth_users_view')
      .select('id, email')
      .eq('email', target)
      .maybeSingle();
    if (viewError || !viewRow) {
      return { success: false, error: `No user found with email ${playerIdentifier}` };
    }
    profileId = viewRow.id;
    resolvedEmail = viewRow.email ?? null;
  } else {
    const { data: profileByName } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', playerIdentifier)
      .single();
    if (!profileByName) {
      return { success: false, error: `No user found with username ${playerIdentifier}` };
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
    const { data: authResp, error: authErr } =
      await supabase.auth.admin.getUserById(profileId);
    if (authErr) {
      return { success: false, error: `Auth lookup failed: ${authErr.message}` };
    }
    resolvedEmail = authResp?.user?.email ?? null;
  }

  if (!resolvedEmail) {
    return { success: false, error: 'Player has no email address' };
  }

  // Ensure an unsubscribe token exists.
  if (!unsubscribeToken) {
    unsubscribeToken = generateUnsubscribeToken();
    await supabase
      .from('profiles')
      .update({ email_unsubscribe_token: unsubscribeToken })
      .eq('id', profileId);
  }

  const language = preferredLanguage || 'en';
  const locale = resolveLocale(language);
  const baseUrl = resolveBaseUrl();
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
  const playUrl = `${baseUrl}${resolvePlayPath(mode, locale)}`;
  const recipientName = displayName || username || 'Word Hunter';

  const { subject, html } = await withTimeout(
    generateGameModeAnnouncementHtml({
      recipientName,
      language,
      mode,
      unsubscribeUrl,
      playUrl,
    }),
    30000,
    'Email render timed out after 30 seconds'
  );

  try {
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
      20000,
      'Resend API timed out after 20 seconds'
    );

    if (result.error) {
      logger.error('EMAIL', `Failed to send game mode announcement to ${resolvedEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    logger.info('EMAIL', `Game mode (${mode}) announcement sent to ${resolvedEmail}`);
    return { success: true, sentTo: resolvedEmail };
  } catch (err) {
    const error = err as Error;
    logger.error('EMAIL', `Game mode announcement error to ${resolvedEmail}:`, error);
    return { success: false, error: error.message };
  }
}
