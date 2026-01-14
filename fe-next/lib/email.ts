/**
 * Email Service using Resend
 *
 * Handles sending daily challenge invitation emails to subscribed users.
 * Supports timezone-aware sending for user's local morning.
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Helper to add timeout to any promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Get Supabase admin client for database operations
function getSupabaseAdmin() {
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

/**
 * Get the current puzzle number (days since launch)
 */
function getPuzzleNumber(): number {
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
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

interface EmailRecipient {
  id: string;
  email: string;
  display_name: string | null;
  username: string;
  timezone: string | null;
  email_unsubscribe_token: string | null;
}

/**
 * Get subscribed users who should receive emails at the current hour
 * Filters by timezone to send at approximately 8 AM local time
 */
export async function getEligibleRecipients(_targetHourUTC: number): Promise<EmailRecipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[Email] Supabase admin client not available');
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
      last_daily_email_sent_at
    `)
    .eq('daily_email_subscribed', true);

  if (error) {
    console.error('[Email] Error fetching subscribed profiles:', error);
    return [];
  }

  if (!profiles || profiles.length === 0) {
    return [];
  }

  // Get emails from auth.users for these profile IDs
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('[Email] Error fetching auth users:', authError);
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
      });
    }
  }

  return recipients;
}

/**
 * Get the current hour in a specific timezone
 */
function getLocalHour(timezone: string): number {
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
  const logoUrl = `${baseUrl}/logos/lexiclash_logo_english-min.png`;
  const bannerUrl = `${baseUrl}/email/daily-banner.png`;

  // Neo-brutalist color palette
  const colors = {
    navy: '#1a1a2e',
    navyLight: '#252545',
    lime: '#CCFF00',
    pink: '#FF1493',
    cyan: '#00FFFF',
    orange: '#FF6B35',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#666666',
    grayLight: '#888888',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.navy}; font-family: 'Fredoka', 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    Daily #${puzzleNumber} is here - same grid, one shot, beat everyone! &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${colors.navy};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 520px; width: 100%; border-collapse: collapse;">

          <!-- Logo Row -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <a href="${baseUrl}" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="160" style="display: block; max-width: 160px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Hero Banner -->
          <tr>
            <td style="padding-bottom: 0;">
              <a href="${playUrl}" style="text-decoration: none;">
                <img src="${bannerUrl}" alt="Daily Challenge" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; border: 4px solid ${colors.black}; border-bottom: 0; border-radius: 16px 16px 0 0; box-shadow: 6px 0 0 ${colors.black};" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(180deg, ${colors.navyLight} 0%, ${colors.navy} 100%); border: 4px solid ${colors.black}; border-top: 0; border-radius: 0 0 16px 16px; padding: 24px 28px 28px; box-shadow: 6px 6px 0px ${colors.black};">

              <!-- Puzzle Number Badge -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background-color: ${colors.lime}; color: ${colors.black}; font-size: 13px; font-weight: 900; padding: 8px 20px; border: 3px solid ${colors.black}; border-radius: 50px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 3px 3px 0 ${colors.black};">
                      ⚡ Puzzle #${puzzleNumber}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h1 style="color: ${colors.white}; font-size: 26px; margin: 0 0 8px 0; font-weight: 800; text-align: center; line-height: 1.2;">
                ${recipientName}, ready to play?
              </h1>

              <!-- Tagline -->
              <p style="color: ${colors.cyan}; font-size: 18px; line-height: 1.4; margin: 0 0 20px 0; text-align: center; font-weight: 700;">
                Today's grid is live. Think you can beat it?
              </p>

              <!-- Value Props (compact grid) -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td width="33%" align="center" style="padding: 8px 4px;">
                    <div style="background: rgba(204, 255, 0, 0.1); border: 2px solid ${colors.lime}; border-radius: 8px; padding: 12px 8px;">
                      <div style="font-size: 20px; margin-bottom: 4px;">🎯</div>
                      <div style="color: ${colors.lime}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Same Grid</div>
                      <div style="color: ${colors.grayLight}; font-size: 9px; margin-top: 2px;">Fair play</div>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 8px 4px;">
                    <div style="background: rgba(255, 20, 147, 0.1); border: 2px solid ${colors.pink}; border-radius: 8px; padding: 12px 8px;">
                      <div style="font-size: 20px; margin-bottom: 4px;">⚡</div>
                      <div style="color: ${colors.pink}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">One Shot</div>
                      <div style="color: ${colors.grayLight}; font-size: 9px; margin-top: 2px;">No retries</div>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 8px 4px;">
                    <div style="background: rgba(0, 255, 255, 0.1); border: 2px solid ${colors.cyan}; border-radius: 8px; padding: 12px 8px;">
                      <div style="font-size: 20px; margin-bottom: 4px;">🏆</div>
                      <div style="color: ${colors.cyan}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Climb Up</div>
                      <div style="color: ${colors.grayLight}; font-size: 9px; margin-top: 2px;">Leaderboard</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button - Neo-Brutalist style -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${playUrl}" style="height:60px;v-text-anchor:middle;width:280px;" arcsize="17%" stroke="t" strokecolor="${colors.black}" strokeweight="4px" fillcolor="${colors.lime}">
                      <w:anchorlock/>
                      <center style="color:${colors.black};font-family:Arial,sans-serif;font-size:20px;font-weight:bold;">PLAY NOW</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${playUrl}" style="display: inline-block; background-color: ${colors.lime}; color: ${colors.black}; font-size: 20px; font-weight: 900; text-decoration: none; padding: 16px 48px; border: 4px solid ${colors.black}; border-radius: 12px; box-shadow: 5px 5px 0px ${colors.black}; text-transform: uppercase; letter-spacing: 3px; transition: all 0.1s ease;">
                      🎮 PLAY NOW
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Streak Reminder -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(90deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.05) 100%); border-left: 4px solid ${colors.orange}; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                      <span style="color: ${colors.orange}; font-size: 15px; font-weight: 700;">
                        🔥 Your streak is on the line — don't let it slip!
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="color: ${colors.gray}; font-size: 12px; margin: 0 0 8px 0; line-height: 1.6;">
                You're receiving this because you subscribed to daily challenges.
              </p>
              <p style="color: ${colors.grayLight}; font-size: 11px; margin: 0; line-height: 1.6;">
                <a href="${unsubscribeUrl}" style="color: ${colors.grayLight}; text-decoration: underline;">Unsubscribe</a>
                &nbsp;•&nbsp;
                <a href="${baseUrl}" style="color: ${colors.grayLight}; text-decoration: underline;">Visit LexiClash</a>
              </p>
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
${recipientName}, ready to play?

═══════════════════════════
   DAILY CHALLENGE #${puzzleNumber}
═══════════════════════════

Today's grid is live. Think you can beat it?

🎯 Same Grid (Fair play)
⚡ One Shot (No retries)
🏆 Climb the Leaderboard

▶ PLAY NOW: ${playUrl}

🔥 Your streak is on the line — don't let it slip!

---
Unsubscribe: ${unsubscribeUrl}
Visit: ${baseUrl}
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
  const playUrl = `${baseUrl}/en/daily`; // TODO: Use user's preferred language
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
      console.error(`[Email] Failed to send to ${recipient.email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    // Update last sent timestamp
    await supabase
      .from('profiles')
      .update({ last_daily_email_sent_at: new Date().toISOString() })
      .eq('id', recipient.id);

    console.log(`[Email] Successfully sent daily challenge to ${recipient.email}`);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    console.error(`[Email] Error sending to ${recipient.email}:`, error);
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

  const { data, error } = await supabase
    .from('profiles')
    .update({ daily_email_subscribed: false })
    .eq('email_unsubscribe_token', token)
    .select('id')
    .single();

  if (error || !data) {
    console.error('[Email] Unsubscribe error:', error);
    return { success: false, error: 'Invalid or expired unsubscribe link' };
  }

  console.log(`[Email] User ${data.id} unsubscribed successfully`);
  return { success: true };
}

/**
 * Send a test email to a specific email address (for admin testing)
 */
export async function sendTestEmail(
  toEmail: string,
  recipientName: string = 'Test User'
): Promise<{ success: boolean; error?: string }> {
  // Using console.warn because console.log is stripped in production
  console.warn('[Email] sendTestEmail called', { toEmail, recipientName });

  if (!resend) {
    console.warn('[Email] Resend client not initialized');
    return { success: false, error: 'Resend not configured - RESEND_API_KEY missing' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    console.warn('[Email] RESEND_FROM_EMAIL not set');
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  console.warn('[Email] Config OK, preparing email', { fromEmail, toEmail });

  const puzzleNumber = getPuzzleNumber();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=test-token-preview`;
  const playUrl = `${baseUrl}/en/daily`;

  const { subject, html, text } = generateDailyChallengeEmail(
    recipientName,
    puzzleNumber,
    unsubscribeUrl,
    playUrl,
    baseUrl
  );

  console.warn('[Email] Sending via Resend...', { subject });

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
      console.error(`[Email] Resend returned error:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.warn(`[Email] Test email sent successfully to ${toEmail}`, { id: result.data?.id });
    return { success: true };
  } catch (err) {
    const error = err as Error;
    console.error('[Email] Error sending test email:', error.message);
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
    console.error('[Email] Update preferences error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
