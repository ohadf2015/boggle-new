import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import {
  isEmailServiceConfigured,
  getEligibleRecipients,
  sendDailyChallengeEmail,
} from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

/**
 * POST /api/email/send-daily
 *
 * Cron endpoint to send daily challenge emails to subscribed users.
 * Should be called hourly by a cron job (e.g., Vercel Cron, Railway Cron).
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access.
 *
 * The endpoint:
 * 1. Gets all subscribed users whose local time is ~8 AM
 * 2. Sends daily challenge email to each
 * 3. Tracks last_daily_email_sent_at to prevent duplicates
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for security (fail-closed — see lib/cronAuth)
  if (!isAuthorizedCronRequest(request)) {
    logger.warn('[Email Cron] Unauthorized request attempted');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if email service is configured
  if (!isEmailServiceConfigured()) {
    logger.warn('[Email Cron] Email service not configured');
    return NextResponse.json(
      { error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.' },
      { status: 503 }
    );
  }

  try {
    // Get the base URL for links in emails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';

    // Get current UTC hour for timezone filtering
    const currentHourUTC = new Date().getUTCHours();

    logger.log(`[Email Cron] Starting daily email send at UTC hour ${currentHourUTC}`);

    // Get eligible recipients (users whose local time is ~8 AM)
    const recipients = await getEligibleRecipients(currentHourUTC);

    logger.log(`[Email Cron] Found ${recipients.length} eligible recipients`);

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No eligible recipients at this time',
        sent: 0,
        failed: 0,
      });
    }

    // Send emails to all recipients
    const results = await Promise.allSettled(
      recipients.map((recipient) => sendDailyChallengeEmail(recipient, baseUrl))
    );

    // Count successes and failures
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
        const errorMsg =
          result.status === 'rejected'
            ? result.reason?.message || 'Unknown error'
            : result.value.error || 'Unknown error';
        errors.push(`${recipients[index].email}: ${errorMsg}`);
      }
    });

    logger.log(`[Email Cron] Completed: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Email Cron] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/email/send-daily',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Failed to send daily emails' },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron (which uses GET by default)
export async function GET(request: NextRequest) {
  return POST(request);
}
