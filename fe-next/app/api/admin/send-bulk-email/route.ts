import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getSupabaseAdmin,
  isEmailServiceConfigured,
  generateUnsubscribeToken,
} from '@/lib/email';
import {
  resolveUserLanguage,
  getFirstLetterForLanguage,
  sendReengagementEmail,
  type ReengagementRecipient,
} from '@/lib/reengagementEmail';
import {
  sendGameModeAnnouncementToPlayer,
  type GameModeKey,
} from '@/lib/gameModeAnnouncementEmail';
import { captureApiError } from '@/utils/sentry';
import logger from '@/backend/utils/logger';

type BulkEmailType = 'reengagement' | 'game-mode-announcement';

/**
 * POST /api/admin/send-bulk-email
 * Send emails to all eligible players. Admin-only.
 *
 * Body: {
 *   emailType: 'reengagement' | 'game-mode-announcement'
 *   mode?: GameModeKey (required for game-mode-announcement)
 *   dryRun?: boolean   (count recipients without sending)
 * }
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

    if (!['reengagement', 'game-mode-announcement'].includes(emailType)) {
      return NextResponse.json({ error: 'Invalid emailType' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 503 });
    }

    // Get all subscribed players (not unsubscribed)
    const { data: players, error: fetchError } = await adminSupabase
      .from('profiles')
      .select('id, display_name, username, timezone, country_code, email_unsubscribe_token, email_subscribed')
      .neq('email_subscribed', false);

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

    // Filter to players with emails
    const eligible = players.filter((p) => emailMap.has(p.id));

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        total: eligible.length,
        message: `Would send ${emailType} email to ${eligible.length} players`,
      });
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

    return NextResponse.json({
      success: true,
      total: eligible.length,
      sent,
      failed,
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
