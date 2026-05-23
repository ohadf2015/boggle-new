/**
 * Email Service using Resend
 *
 * Handles sending daily challenge invitation emails to subscribed users.
 * Supports timezone-aware sending for user's local morning.
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import logger from '@/backend/utils/logger';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Helper to add timeout to any promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Get Supabase admin client for database operations
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Check if email service is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

/**
 * Generate a secure unsubscribe token for a user
 */
export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Profile column that records campaign/marketing email opt-out. */
export const CAMPAIGN_SUBSCRIPTION_COLUMN = 'daily_email_subscribed' as const;

/**
 * Single source of truth for "has this user opted OUT of marketing/campaign
 * email?". One-click unsubscribe sets `daily_email_subscribed = false` (see
 * unsubscribeByToken). NULL/true = still subscribed (legacy rows default NULL).
 *
 * This is a campaign/marketing guard ONLY — transactional email (magic link,
 * password reset, account/security) must NOT consult it. Every BULK or campaign
 * recipient list must pass through this so the unsubscribe guarantee can never
 * regress from a drifting hand-written query.
 */
export function isUnsubscribedFromCampaigns(
  profile: { daily_email_subscribed?: boolean | null } | null | undefined
): boolean {
  return profile?.daily_email_subscribed === false;
}

/**
 * Get the current puzzle number (days since launch)
 */
export function getPuzzleNumber(): number {
  const launchDate = new Date('2025-12-30'); // Puzzle #1 = 2025-12-30, Puzzle #2 = 2025-12-31
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - launchDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/** Neo-brutalist color palette shared across email templates */
export const EMAIL_COLORS = {
  navy: '#1a1a2e',
  navyLight: '#16213e',
  navyCard: '#252545',
  lime: '#BFFF00',
  limeLight: '#D9FF66',
  limeMuted: '#A6D900',
  pink: '#FF1493',
  pinkLight: '#FF6BB8',
  cyan: '#00FFFF',
  cyanMuted: '#4DD9D9',
  purple: '#8B5CF6',
  orange: '#FF6B35',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  grayLight: '#9CA3AF',
  grayDark: '#374151',
};

interface EmailRecipient {
  id: string;
  email: string;
  display_name: string | null;
  username: string;
  timezone: string | null;
  email_unsubscribe_token: string | null;
  country_code: string | null;
}

/**
 * Map country code to app locale for email links.
 * Falls back to 'en' for unknown countries.
 */
function getLocaleFromCountry(countryCode: string | null): string {
  if (!countryCode) return 'en';
  const cc = countryCode.toUpperCase();
  if (cc === 'IL') return 'he';
  if (cc === 'SE') return 'sv';
  if (cc === 'JP') return 'ja';
  if (['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'DO', 'HN', 'SV', 'NI', 'CR', 'PA', 'UY', 'PY', 'BO'].includes(cc)) return 'es';
  return 'en';
}

/**
 * Get subscribed users who should receive emails at the current hour
 * Filters by timezone to send at approximately 8 AM local time
 */
export async function getEligibleRecipients(_targetHourUTC: number): Promise<EmailRecipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    logger.error('EMAIL', 'Supabase admin client not available');
    return [];
  }

  // Get all subscribed users with their auth email
  // We join with auth.users to get the email address
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      username,
      timezone,
      email_unsubscribe_token,
      country_code,
      last_daily_email_sent_at
    `)
    .eq('daily_email_subscribed', true);

  if (error) {
    logger.error('EMAIL', 'Error fetching subscribed profiles:', error);
    return [];
  }

  if (!profiles || profiles.length === 0) {
    return [];
  }

  // Get emails from auth.users for these profile IDs
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    logger.error('EMAIL', 'Error fetching auth users:', authError);
    return [];
  }

  // Create a map of user IDs to emails
  const emailMap = new Map<string, string>();
  authUsers.users.forEach(user => {
    if (user.email) {
      emailMap.set(user.id, user.email);
    }
  });

  const today = getTodayDate();
  const recipients: EmailRecipient[] = [];

  for (const profile of profiles) {
    const email = emailMap.get(profile.id);
    if (!email) continue;

    // Skip if already sent today
    if (profile.last_daily_email_sent_at) {
      const lastSentDate = new Date(profile.last_daily_email_sent_at).toISOString().split('T')[0];
      if (lastSentDate === today) {
        continue;
      }
    }

    // Check if it's approximately 8 AM in user's timezone
    const userTimezone = profile.timezone || 'UTC';
    const localHour = getLocalHour(userTimezone);

    // Send if local hour is 8 AM (allow some flexibility: 7-9 AM)
    if (localHour >= 7 && localHour <= 9) {
      recipients.push({
        id: profile.id,
        email,
        display_name: profile.display_name,
        username: profile.username,
        timezone: profile.timezone,
        email_unsubscribe_token: profile.email_unsubscribe_token,
        country_code: profile.country_code ?? null,
      });
    }
  }

  return recipients;
}

/**
 * Get the current hour in a specific timezone
 */
export function getLocalHour(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    // Invalid timezone, default to UTC
    return new Date().getUTCHours();
  }
}

/**
 * Current minute-of-day [0..1439] in a specific timezone. Used by the
 * smart daily-challenge reminder to match each user's "usual play time"
 * against now, with circular-clock arithmetic.
 */
export function getLocalMinuteOfDay(timezone: string, now: Date = new Date()): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = fmt.formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    // Intl can emit "24" for midnight in some locales; fold to 0.
    return ((h % 24) * 60 + m) % 1440;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

/**
 * Subject line variations for A/B testing
 * Rotate through these to find the best performer
 */
const SUBJECT_LINES = [
  (n: number) => `🔥 Daily #${n} just dropped`,
  (_n: number) => `Your puzzle awaits, Word Hunter`,
  (n: number) => `Daily #${n} - Can you crack it?`,
  (_n: number) => `⚡ Fresh puzzle. Same grid. Beat everyone.`,
  (n: number) => `Daily #${n} is live - don't miss out`,
];

/**
 * Get a subject line - rotates based on puzzle number for natural A/B testing
 */
function getSubjectLine(puzzleNumber: number): string {
  const index = puzzleNumber % SUBJECT_LINES.length;
  return SUBJECT_LINES[index](puzzleNumber);
}

/**
 * Generate the HTML email content for daily challenge
 * Uses Neo-Brutalist design: hard shadows, thick borders, bold colors
 */
function generateDailyChallengeEmail(
  recipientName: string,
  puzzleNumber: number,
  unsubscribeUrl: string,
  playUrl: string,
  baseUrl: string,
  _language: string = 'en'
): { subject: string; html: string; text: string } {
  const subject = getSubjectLine(puzzleNumber);
  const logoUrl = `${baseUrl}/logos/lexiclash_logo_english-min.webp`;
  const colors = EMAIL_COLORS;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
    .button-link { background-color: ${colors.lime} !important; }
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background-color: ${colors.navy};
      font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .button-cta:hover {
      transform: translate(2px, 2px);
      box-shadow: 3px 3px 0px ${colors.black} !important;
    }

    @media only screen and (max-width: 600px) {
      .container { padding: 16px !important; }
      .main-card { padding: 20px 16px !important; }
      .hero-title { font-size: 28px !important; }
      .hero-subtitle { font-size: 16px !important; }
      .feature-card { padding: 12px 8px !important; }
      .feature-label { font-size: 10px !important; }
      .cta-button { padding: 14px 32px !important; font-size: 16px !important; }
    }
  </style>
</head>
<body>
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${colors.navy};">
    Daily #${puzzleNumber} is here — same grid, one shot. Quick game when you've got 30 seconds 🔥 &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${colors.navy};">
    <tr>
      <td align="center" class="container" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${baseUrl}" target="_blank" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="140" style="display: block; max-width: 140px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(180deg, ${colors.navyCard} 0%, ${colors.navyLight} 100%); border: 4px solid ${colors.black}; border-radius: 20px; box-shadow: 8px 8px 0px ${colors.black}; overflow: hidden;">

                <!-- Decorative Header Bar -->
                <tr>
                  <td style="background: linear-gradient(90deg, ${colors.lime} 0%, ${colors.cyan} 50%, ${colors.pink} 100%); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <!-- Card Content -->
                <tr>
                  <td class="main-card" style="padding: 32px 28px 36px;">

                    <!-- Live Badge & Puzzle Number -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color: ${colors.pink}; padding: 6px 12px; border-radius: 4px 0 0 4px; border: 2px solid ${colors.black}; border-right: none;">
                                <span style="color: ${colors.white}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">● LIVE</span>
                              </td>
                              <td style="background-color: ${colors.lime}; padding: 6px 16px; border-radius: 0 4px 4px 0; border: 2px solid ${colors.black};">
                                <span style="color: ${colors.black}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">PUZZLE #${puzzleNumber}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Greeting -->
                    <h1 class="hero-title" style="color: ${colors.white}; font-size: 32px; margin: 0 0 8px 0; font-weight: 700; text-align: center; line-height: 1.2;">
                      Hey ${recipientName}! 👋
                    </h1>

                    <!-- Tagline -->
                    <p class="hero-subtitle" style="color: ${colors.grayLight}; font-size: 18px; line-height: 1.5; margin: 0 0 28px 0; text-align: center; font-weight: 500;">
                      Your daily word challenge is ready.<br/>
                      <span style="color: ${colors.cyan}; font-weight: 600;">Same grid for everyone. Can you top the board?</span>
                    </p>

                    <!-- Feature Cards -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                      <tr>
                        <td width="33%" align="center" style="padding: 0 4px;">
                          <div class="feature-card" style="background: rgba(191, 255, 0, 0.08); border: 2px solid ${colors.lime}; border-radius: 12px; padding: 16px 8px;">
                            <div style="width: 40px; height: 40px; background: ${colors.lime}; border-radius: 10px; border: 2px solid ${colors.black}; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 ${colors.black};">
                              <span style="font-size: 20px; line-height: 1;">🎯</span>
                            </div>
                            <div class="feature-label" style="color: ${colors.lime}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Same Grid</div>
                            <div style="color: ${colors.grayLight}; font-size: 11px; margin-top: 4px;">Fair for all</div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding: 0 4px;">
                          <div class="feature-card" style="background: rgba(255, 20, 147, 0.08); border: 2px solid ${colors.pink}; border-radius: 12px; padding: 16px 8px;">
                            <div style="width: 40px; height: 40px; background: ${colors.pink}; border-radius: 10px; border: 2px solid ${colors.black}; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 ${colors.black};">
                              <span style="font-size: 20px; line-height: 1;">⚡</span>
                            </div>
                            <div class="feature-label" style="color: ${colors.pink}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">One Shot</div>
                            <div style="color: ${colors.grayLight}; font-size: 11px; margin-top: 4px;">No retries</div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding: 0 4px;">
                          <div class="feature-card" style="background: rgba(0, 255, 255, 0.08); border: 2px solid ${colors.cyan}; border-radius: 12px; padding: 16px 8px;">
                            <div style="width: 40px; height: 40px; background: ${colors.cyan}; border-radius: 10px; border: 2px solid ${colors.black}; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 ${colors.black};">
                              <span style="font-size: 20px; line-height: 1;">🏆</span>
                            </div>
                            <div class="feature-label" style="color: ${colors.cyan}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Compete</div>
                            <div style="color: ${colors.grayLight}; font-size: 11px; margin-top: 4px;">Leaderboard</div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${playUrl}" style="height:56px;v-text-anchor:middle;width:260px;" arcsize="14%" stroke="t" strokecolor="${colors.black}" strokeweight="3px" fillcolor="${colors.lime}">
                            <w:anchorlock/>
                            <center style="color:${colors.black};font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">▶ PLAY NOW</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${playUrl}" target="_blank" class="cta-button button-cta" style="display: inline-block; background: linear-gradient(180deg, ${colors.lime} 0%, ${colors.limeMuted} 100%); color: ${colors.black}; font-size: 18px; font-weight: 700; text-decoration: none; padding: 16px 48px; border: 3px solid ${colors.black}; border-radius: 12px; box-shadow: 5px 5px 0px ${colors.black}; text-transform: uppercase; letter-spacing: 2px;">
                            ▶ &nbsp;PLAY NOW
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Streak Reminder -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td>
                          <div style="background: linear-gradient(90deg, rgba(255, 107, 53, 0.12) 0%, rgba(255, 107, 53, 0.04) 100%); border: 2px solid rgba(255, 107, 53, 0.3); border-left: 4px solid ${colors.orange}; border-radius: 8px; padding: 14px 16px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="middle">
                                  <span style="font-size: 22px;">🔥</span>
                                </td>
                                <td valign="middle">
                                  <span style="color: ${colors.orange}; font-size: 14px; font-weight: 600; line-height: 1.4;">
                                    Fresh puzzle's up. 30 seconds, one word.
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              <!-- Social Proof -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <span style="color: ${colors.grayLight}; font-size: 13px; font-weight: 500;">
                      Join thousands of word hunters playing daily 🌍
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="border-top: 1px solid ${colors.grayDark};">&nbsp;</td>
                </tr>
              </table>

              <!-- Footer Links -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="color: ${colors.gray}; font-size: 12px; margin: 0 0 12px 0; line-height: 1.6;">
                      You're receiving this because you subscribed to daily challenges.
                    </p>
                    <p style="color: ${colors.gray}; font-size: 12px; margin: 0; line-height: 1.6;">
                      <a href="${unsubscribeUrl}" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Unsubscribe</a>
                      <span style="color: ${colors.grayDark};">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
                      <a href="${baseUrl}" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Visit LexiClash</a>
                      <span style="color: ${colors.grayDark};">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
                      <a href="${baseUrl}/en/privacy" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Privacy</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Logo Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <span style="color: ${colors.grayDark}; font-size: 11px;">© ${new Date().getFullYear()} LexiClash. Made with 💚 for word lovers.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Hey ${recipientName}! 👋

════════════════════════════════
     DAILY PUZZLE #${puzzleNumber}
         ● NOW LIVE ●
════════════════════════════════

Your daily word challenge is ready.
Same grid for everyone. Can you top the board?

🎯 SAME GRID — Fair for all players
⚡ ONE SHOT — No retries allowed
🏆 COMPETE — Climb the leaderboard

▶▶▶ PLAY NOW: ${playUrl}

🔥 Fresh puzzle's up. 30 seconds, one word.

---

Join thousands of word hunters playing daily 🌍

Unsubscribe: ${unsubscribeUrl}
Visit LexiClash: ${baseUrl}
Privacy Policy: ${baseUrl}/en/privacy

© ${new Date().getFullYear()} LexiClash. Made with 💚 for word lovers.
`;

  return { subject, html, text };
}

/**
 * Send daily challenge email to a single recipient
 */
export async function sendDailyChallengeEmail(
  recipient: EmailRecipient,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: 'Resend not configured' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Generate unsubscribe token if not exists
  let unsubscribeToken = recipient.email_unsubscribe_token;
  if (!unsubscribeToken) {
    unsubscribeToken = generateUnsubscribeToken();
    await supabase
      .from('profiles')
      .update({ email_unsubscribe_token: unsubscribeToken })
      .eq('id', recipient.id);
  }

  const puzzleNumber = getPuzzleNumber();
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
  const locale = getLocaleFromCountry(recipient.country_code);
  const playUrl = `${baseUrl}/${locale}/daily`;
  const recipientName = recipient.display_name || recipient.username || 'Word Hunter';

  const { subject, html, text } = generateDailyChallengeEmail(
    recipientName,
    puzzleNumber,
    unsubscribeUrl,
    playUrl,
    baseUrl
  );

  try {
    // Add 10-second timeout to prevent hanging
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
      logger.error('EMAIL', `Failed to send to ${recipient.email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    // Update last sent timestamp
    await supabase
      .from('profiles')
      .update({ last_daily_email_sent_at: new Date().toISOString() })
      .eq('id', recipient.id);

    logger.info('EMAIL', `Successfully sent daily challenge to ${recipient.email}`);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    logger.error('EMAIL', `Error sending to ${recipient.email}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe a user by their unsubscribe token
 */
export async function unsubscribeByToken(token: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  // Try profiles first (registered users)
  const { data, error } = await supabase
    .from('profiles')
    .update({ daily_email_subscribed: false })
    .eq('email_unsubscribe_token', token)
    .select('id')
    .single();

  if (data && !error) {
    logger.info('EMAIL', `User ${data.id} unsubscribed successfully`);
    return { success: true };
  }

  // Fallback: check email_subscribers (marketing signups)
  const { data: subData, error: subError } = await supabase
    .from('email_subscribers')
    .update({ is_active: false })
    .eq('unsubscribe_token', token)
    .select('email');

  if (subError || !subData || subData.length === 0) {
    logger.error('EMAIL', 'Unsubscribe error: token not found in profiles or subscribers');
    return { success: false, error: 'Invalid or expired unsubscribe link' };
  }

  logger.info('EMAIL', `Subscriber ${subData[0].email} unsubscribed successfully`);
  return { success: true };
}

export interface SubscriberRecipient {
  id: number;
  email: string;
  language: string;
  unsubscribe_token: string;
}

const CAMPAIGN_ANTI_SPAM_DAYS = 14;

/**
 * Get eligible marketing subscribers for campaign emails.
 * Filters: is_active = true, anti-spam interval (14 days), deduped against registered user emails.
 */
export async function getSubscriberRecipients(
  registeredEmails: Set<string>
): Promise<SubscriberRecipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const cutoff = new Date(Date.now() - CAMPAIGN_ANTI_SPAM_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('email_subscribers')
    .select('id, email, language, unsubscribe_token, last_campaign_email_sent_at')
    .eq('is_active', true)
    .or(`last_campaign_email_sent_at.is.null,last_campaign_email_sent_at.lte.${cutoff}`);

  if (error || !data) {
    logger.error('EMAIL', 'Failed to fetch subscriber recipients:', error);
    return [];
  }

  return data.filter(
    (s: { email: string }) => !registeredEmails.has(s.email)
  ) as SubscriberRecipient[];
}

/**
 * Send a test email to a specific email address (for admin testing)
 */
export async function sendTestEmail(
  toEmail: string,
  recipientName: string = 'Test User'
): Promise<{ success: boolean; error?: string }> {
  logger.warn('EMAIL', 'sendTestEmail called', { toEmail, recipientName });

  if (!resend) {
    logger.warn('EMAIL', 'Resend client not initialized');
    return { success: false, error: 'Resend not configured - RESEND_API_KEY missing' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    logger.warn('EMAIL', 'RESEND_FROM_EMAIL not set');
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  logger.warn('EMAIL', 'Config OK, preparing email', { fromEmail, toEmail });

  const puzzleNumber = getPuzzleNumber();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=test-token-preview`;
  const playUrl = `${baseUrl}/en/daily`;

  const { subject, html, text } = generateDailyChallengeEmail(
    recipientName,
    puzzleNumber,
    unsubscribeUrl,
    playUrl,
    baseUrl
  );

  logger.warn('EMAIL', 'Sending via Resend...', { subject });

  try {
    // Add 10-second timeout to prevent hanging
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
      logger.error('EMAIL', 'Resend returned error:', result.error);
      return { success: false, error: result.error.message };
    }

    logger.warn('EMAIL', `Test email sent successfully to ${toEmail}`, { id: result.data?.id });
    return { success: true };
  } catch (err) {
    const error = err as Error;
    logger.error('EMAIL', 'Error sending test email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update email preferences for a user
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: {
    daily_email_subscribed?: boolean;
    timezone?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  const updates: Record<string, unknown> = {};

  if (typeof preferences.daily_email_subscribed === 'boolean') {
    updates.daily_email_subscribed = preferences.daily_email_subscribed;
  }

  if (preferences.timezone) {
    updates.timezone = preferences.timezone;
  }

  // Generate unsubscribe token if subscribing and doesn't have one
  if (preferences.daily_email_subscribed === true) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_unsubscribe_token')
      .eq('id', userId)
      .single();

    if (!profile?.email_unsubscribe_token) {
      updates.email_unsubscribe_token = generateUnsubscribeToken();
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    logger.error('EMAIL', 'Update preferences error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
