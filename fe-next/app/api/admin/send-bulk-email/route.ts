import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getSupabaseAdmin,
  isEmailServiceConfigured,
  generateUnsubscribeToken,
  getSubscriberRecipients,
  isUnsubscribedFromCampaigns,
  CAMPAIGN_SUBSCRIPTION_COLUMN,
} from '@/lib/email';
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
  | 'android-release-launch';

/**
 * POST /api/admin/send-bulk-email
 * Send emails to all eligible players. Admin-only.
 *
 * Body: {
 *   emailType: 'reengagement' | 'game-mode-announcement' | 'android-release-launch'
 *   mode?: GameModeKey (required for game-mode-announcement)
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

    if (!['reengagement', 'game-mode-announcement', 'android-release-launch'].includes(emailType)) {
      return NextResponse.json({ error: 'Invalid emailType' }, { status: 400 });
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

    // Get all subscribed players (not unsubscribed).
    // One-click unsubscribe flips daily_email_subscribed=false (see
    // lib/email.ts unsubscribeByToken). `.neq(..., false)` keeps NULL + true
    // (legacy rows default NULL). We also SELECT the flag so the in-memory guard
    // below can act as a second line of defense if this query ever drifts.
    const { data: players, error: fetchError } = await adminSupabase
      .from('profiles')
      .select(
        `id, display_name, username, timezone, country_code, email_unsubscribe_token, ${CAMPAIGN_SUBSCRIPTION_COLUMN}`
      )
      .neq(CAMPAIGN_SUBSCRIPTION_COLUMN, false);

    if (fetchError) {
      logger.error('BULK_EMAIL', 'Failed to fetch players:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ success: true, message: 'No eligible players', total: 0, sent: 0, failed: 0 });
    }

    // Resolve emails via auth
    const { data: authData, error: authListError } = await adminSupabase.auth.admin.listUsers();
    if (authListError) {
      return NextResponse.json({ error: 'Failed to list auth users' }, { status: 500 });
    }

    const emailMap = new Map<string, string>();
    for (const u of authData.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    // Filter to players with emails, then HARD-suppress anyone who unsubscribed.
    // The unsubscribe guard is enforced here in-memory (not just in the query)
    // so it holds for every bulk email type even if the recipient query changes.
    const eligible = players
      .filter((p) => emailMap.has(p.id))
      .filter((p) => !isUnsubscribedFromCampaigns(p));

    if (dryRun) {
      const dryRunResponse: Record<string, unknown> = {
        success: true,
        dryRun: true,
        total: eligible.length,
        message: `Would send ${emailType} email to ${eligible.length} players`,
      };

      if (includeSubscribers) {
        const registeredEmailSet = new Set(emailMap.values());
        const subscribers = await getSubscriberRecipients(registeredEmailSet);
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

    for (const player of eligible) {
      const playerEmail = emailMap.get(player.id)!;

      try {
        if (emailType === 'reengagement') {
          const language = await resolveUserLanguage(player.id, player.country_code);
          const letterData = await getFirstLetterForLanguage(language);
          const firstLetter = letterData?.letter || '?';

          let unsubToken = player.email_unsubscribe_token;
          if (!unsubToken) {
            unsubToken = generateUnsubscribeToken();
            await adminSupabase
              .from('profiles')
              .update({ email_unsubscribe_token: unsubToken })
              .eq('id', player.id);
          }

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

          let unsubToken = player.email_unsubscribe_token;
          if (!unsubToken) {
            unsubToken = generateUnsubscribeToken();
            await adminSupabase
              .from('profiles')
              .update({ email_unsubscribe_token: unsubToken })
              .eq('id', player.id);
          }

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
      const registeredEmailSet = new Set(emailMap.values());
      const subscribers = await getSubscriberRecipients(registeredEmailSet);

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
