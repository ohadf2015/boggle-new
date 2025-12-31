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
export async function getEligibleRecipients(targetHourUTC: number): Promise<EmailRecipient[]> {
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
  (n: number) => `Your puzzle awaits, Word Hunter`,
  (n: number) => `Daily #${n} - Can you crack it?`,
  (n: number) => `⚡ Fresh puzzle. Same grid. Beat everyone.`,
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
 */
function generateDailyChallengeEmail(
  recipientName: string,
  puzzleNumber: number,
  unsubscribeUrl: string,
  playUrl: string,
  baseUrl: string,
  language: string = 'en'
): { subject: string; html: string; text: string } {
  const subject = getSubjectLine(puzzleNumber);
  const logoUrl = `${baseUrl}/logos/lexiclash_logo_english-min.png`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${baseUrl}" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="180" style="display: block; max-width: 180px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(180deg, #2a2a4e 0%, #1f1f3a 100%); border: 4px solid #000; border-radius: 12px; padding: 28px 24px; box-shadow: 8px 8px 0px #000;">
              <!-- Daily Number Badge -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background-color: #FFE135; color: #000; font-size: 14px; font-weight: 900; padding: 6px 16px; border: 3px solid #000; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
                      Daily #${puzzleNumber}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 12px 0; font-weight: 800; text-align: center; line-height: 1.3;">
                ${recipientName}, it's go time! ⚡
              </h1>

              <!-- Short Punchy Message -->
              <p style="color: #00FFFF; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0; text-align: center; font-weight: 600;">
                One grid. One shot. Beat the world.
              </p>

              <!-- CTA Button - Large and Bold -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${playUrl}" style="display: block; width: 100%; max-width: 280px; background-color: #FFE135; color: #000; font-size: 22px; font-weight: 900; text-decoration: none; padding: 18px 32px; border: 4px solid #000; border-radius: 12px; box-shadow: 6px 6px 0px #000; text-transform: uppercase; letter-spacing: 2px; text-align: center;">
                      🎯 PLAY NOW
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Streak Reminder -->
              <p style="color: #FF6B35; font-size: 15px; margin: 20px 0 0 0; text-align: center; font-weight: 700;">
                🔥 Don't break your streak!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 20px; text-align: center;">
              <p style="color: #666; font-size: 11px; margin: 0; line-height: 1.6;">
                <a href="${unsubscribeUrl}" style="color: #888; text-decoration: underline;">Unsubscribe</a>
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
${recipientName}, it's go time!

DAILY #${puzzleNumber}

One grid. One shot. Beat the world.

🎯 PLAY NOW: ${playUrl}

🔥 Don't break your streak!

---
Unsubscribe: ${unsubscribeUrl}
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
