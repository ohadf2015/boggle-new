import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getSupabaseAdmin,
  isEmailServiceConfigured,
  generateUnsubscribeToken,
  getSubscriberRecipients,
} from '@/lib/email';
import { loadCampaignRecipients, ensureUnsubscribeToken, type CampaignRecipient } from '@/lib/campaignRecipients';
import {
  planHolidayGreeting,
  sendHolidayGreetingToRecipient,
  HOLIDAY_KEYS_FOR_EMAIL,
} from '@/lib/holidayGreetingEmail';
import type { HolidayKey } from '@/lib/holidays/calendar';
import {
  resolveUserLanguage,
  getFirstLetterForLanguage,
  sendReengagementEmail,
  type ReengagementRecipient,
} from '@/lib/reengagementEmail';
import {
  sendGameModeAnnouncementToPlayer,
  generateGameModeAnnouncementHtml,
  type GameModeKey,
} from '@/lib/gameModeAnnouncementEmail';
import { sendAndroidReleaseLaunchToRecipient } from '@/lib/androidReleaseLaunchEmail';
import { Resend } from 'resend';
import { captureApiError } from '@/utils/sentry';
import logger from '@/backend/utils/logger';

export const maxDuration = 60;

type BulkEmailType =
  | 'reengagement'
  | 'game-mode-announcement'
  | 'android-release-launch'
  | 'holiday-greeting';

const EMAIL_TYPES: readonly BulkEmailType[] = [
  'reengagement',
  'game-mode-announcement',
  'android-release-launch',
  'holiday-greeting',
];

/**
 * POST /api/admin/send-bulk-email
 * Send emails to all eligible players. Admin-only.
 *
 * Body: {
 *   emailType: 'reengagement' | 'game-mode-announcement' | 'android-release-launch' | 'holiday-greeting'
 *   mode?: GameModeKey (required for game-mode-announcement)
 *   holiday?: 'hanukkah' | 'christmas' (holiday-greeting: only recipients whose default holiday matches)
 *   dryRun?: boolean   (count recipients without sending)
 * }
 *
 * NOTE (android-release-launch): the hero image is hosted at
 * lexiclash.live/email-assets/ — a deploy must land BEFORE a real blast or
 * recipients get a broken image.
 */
export async function POST(request: NextRequest) {
  if (!isEmailServiceConfigured()) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  try {
    // Admin auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const emailType: BulkEmailType = body.emailType;
    const dryRun = body.dryRun === true;
    const mode: GameModeKey = body.mode || 'blast';
    const includeSubscribers = body.includeSubscribers === true;

    if (!EMAIL_TYPES.includes(emailType)) {
      return NextResponse.json({ error: 'Invalid emailType' }, { status: 400 });
    }

    const holidayFilter: HolidayKey | undefined = body.holiday ?? undefined;
    if (holidayFilter !== undefined && !HOLIDAY_KEYS_FOR_EMAIL.includes(holidayFilter)) {
      return NextResponse.json({ error: 'Invalid holiday' }, { status: 400 });
    }

    if (includeSubscribers && emailType !== 'game-mode-announcement') {
      return NextResponse.json(
        { error: 'includeSubscribers not valid for reengagement emails' },
        { status: 400 }
      );
    }

    const adminSupabase = getSupabaseAdmin();
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 503 });
    }

    const audience = await loadCampaignRecipients(adminSupabase);
    if (!audience.ok) {
      logger.error('BULK_EMAIL', audience.error);
      return NextResponse.json({ error: audience.error }, { status: 500 });
    }
    const holidayPlan =
      emailType === 'holiday-greeting' ? planHolidayGreeting(audience.recipients, holidayFilter) : null;
    const eligible: CampaignRecipient[] = holidayPlan
      ? holidayPlan.plan.map((p) => p.recipient)
      : audience.recipients;

    if (eligible.length === 0) {
      return NextResponse.json({ success: true, message: 'No eligible players', total: 0, sent: 0, failed: 0 });
    }

    const ensureUnsubToken = (player: CampaignRecipient) =>
      ensureUnsubscribeToken(adminSupabase, player, generateUnsubscribeToken);

    if (dryRun) {
      const dryRunResponse: Record<string, unknown> = {
        success: true,
        dryRun: true,
        total: eligible.length,
        message: `Would send ${emailType} email to ${eligible.length} players`,
        ...(holidayPlan && { byHoliday: holidayPlan.counts }),
      };

      if (includeSubscribers) {
        const subscribers = await getSubscriberRecipients(audience.registeredEmails);
        dryRunResponse.subscriberTotal = subscribers.length;
        dryRunResponse.message += ` + ${subscribers.length} subscribers`;
      }

      return NextResponse.json(dryRunResponse);
    }

    logger.info('BULK_EMAIL', `Starting bulk ${emailType} send to ${eligible.length} players`);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';

    const holidayById = new Map(holidayPlan?.plan.map((p) => [p.recipient.id, p]) ?? []);

    for (const player of eligible) {
      const playerEmail = player.email;

      try {
        if (emailType === 'holiday-greeting') {
          const { holiday, language } = holidayById.get(player.id)!;
          const unsubToken = await ensureUnsubToken(player);
          const result = await sendHolidayGreetingToRecipient({
            email: playerEmail,
            recipientName: player.display_name || player.username || 'Word Hunter',
            language,
            holiday,
            unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?token=${unsubToken}`,
          });
          if (result.success) sent++;
          else { failed++; errors.push(`${playerEmail}: ${result.error}`); }
        } else if (emailType === 'reengagement') {
          const language = await resolveUserLanguage(player.id, player.country_code);
          const letterData = await getFirstLetterForLanguage(language);
          const firstLetter = letterData?.letter || '?';

          const unsubToken = await ensureUnsubToken(player);

          const recipient: ReengagementRecipient = {
            id: player.id,
            email: playerEmail,
            display_name: player.display_name,
            username: player.username || 'player',
            timezone: player.timezone,
            country_code: player.country_code,
            email_unsubscribe_token: unsubToken,
          };

          const result = await sendReengagementEmail(recipient, language, firstLetter, baseUrl);
          if (result.success) sent++;
          else { failed++; errors.push(`${playerEmail}: ${result.error}`); }
        } else if (emailType === 'android-release-launch') {
          const language = await resolveUserLanguage(player.id, player.country_code);

          const unsubToken = await ensureUnsubToken(player);

          const result = await sendAndroidReleaseLaunchToRecipient({
            email: playerEmail,
            recipientName: player.display_name || player.username || 'Word Hunter',
            language,
            unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?token=${unsubToken}`,
          });
          if (result.success) sent++;
          else { failed++; errors.push(`${playerEmail}: ${result.error}`); }
        } else {
          // game-mode-announcement — use existing per-player function
          const result = await sendGameModeAnnouncementToPlayer(playerEmail, mode);
          if (result.success) sent++;
          else { failed++; errors.push(`${playerEmail}: ${result.error}`); }
        }
      } catch (err) {
        failed++;
        errors.push(`${playerEmail}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    logger.info('BULK_EMAIL', `Bulk ${emailType} done: ${sent} sent, ${failed} failed out of ${eligible.length}`);

    // ── Subscriber campaign sends ────────────────────────────────
    let subscribersSent: number | undefined;
    let subscribersFailed = 0;

    if (includeSubscribers && emailType === 'game-mode-announcement') {
      const subscribers = await getSubscriberRecipients(audience.registeredEmails);

      const resendClient = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL!;
      subscribersSent = 0;

      for (const sub of subscribers) {
        try {
          const language = sub.language || 'en';
          const locale = language === 'en' ? 'en' : language;
          const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${sub.unsubscribe_token}`;
          const playUrl = `${baseUrl}/${locale}/${mode}`;

          const { subject, html } = await generateGameModeAnnouncementHtml({
            recipientName: 'Word Hunter',
            language,
            mode,
            unsubscribeUrl,
            playUrl,
          });

          const result = await resendClient.emails.send({
            from: fromEmail,
            to: sub.email,
            subject,
            html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });

          if (result.error) {
            subscribersFailed++;
            errors.push(`[sub] ${sub.email}: ${result.error.message}`);
          } else {
            subscribersSent++;
            // Update anti-spam timestamp
            await adminSupabase
              .from('email_subscribers')
              .update({ last_campaign_email_sent_at: new Date().toISOString() })
              .eq('id', sub.id);
          }
        } catch (err) {
          subscribersFailed++;
          errors.push(`[sub] ${sub.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      logger.info('BULK_EMAIL', `Subscriber sends: ${subscribersSent} sent, ${subscribersFailed} failed`);
    }

    return NextResponse.json({
      success: true,
      total: eligible.length,
      sent,
      failed,
      ...(subscribersSent !== undefined && { subscribersSent, subscribersFailed }),
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/admin/send-bulk-email',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
