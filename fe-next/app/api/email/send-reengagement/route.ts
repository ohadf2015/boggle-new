import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { isEmailServiceConfigured } from '@/lib/email';
import {
  getReengagementRecipients,
  resolveUserLanguage,
  getFirstLetterForLanguage,
  sendReengagementEmail,
} from '@/lib/reengagementEmail';
import { captureApiError } from '@/utils/sentry';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

/**
 * POST /api/email/send-reengagement
 *
 * Cron endpoint to send re-engagement emails to inactive daily challenge players.
 * Secured with CRON_SECRET header (fail-closed). Should be called hourly.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isEmailServiceConfigured()) {
    return NextResponse.json(
      { error: 'Email service not configured' },
      { status: 503 }
    );
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';

    logger.log('[Reengagement Cron] Starting...');
    const recipients = await getReengagementRecipients();
    logger.log(`[Reengagement Cron] Found ${recipients.length} eligible recipients`);

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, message: 'No eligible recipients', sent: 0, failed: 0 });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process sequentially to avoid rate limits
    for (const recipient of recipients) {
      const language = await resolveUserLanguage(recipient.id, recipient.country_code);
      const letterData = await getFirstLetterForLanguage(language);

      if (!letterData) {
        // Try English fallback
        const fallback = await getFirstLetterForLanguage('en');
        if (!fallback) {
          errors.push(`${recipient.email}: no daily word found`);
          failed++;
          continue;
        }
        const result = await sendReengagementEmail(
          recipient,
          'en',
          fallback.letter,
          baseUrl,
          fallback.word.length,
        );
        if (result.success) sent++;
        else { failed++; errors.push(`${recipient.email}: ${result.error}`); }
        continue;
      }

      const result = await sendReengagementEmail(
        recipient,
        language,
        letterData.letter,
        baseUrl,
        letterData.word.length,
      );
      if (result.success) sent++;
      else { failed++; errors.push(`${recipient.email}: ${result.error}`); }
    }

    logger.log(`[Reengagement Cron] Done: ${sent} sent, ${failed} failed`);
    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('[Reengagement Cron] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/email/send-reengagement',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Failed to send re-engagement emails' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
