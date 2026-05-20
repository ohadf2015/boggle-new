import { NextRequest, NextResponse } from 'next/server';
import { sendTestAndroidReleaseLaunch } from '@/lib/androidReleaseLaunchEmail';
import { isEmailServiceConfigured } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import logger from '@/backend/utils/logger';

const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

export const maxDuration = 60;

/**
 * POST /api/admin/send-test-android-release-launch
 * Admin-only. Sends a [TEST] public Android release announcement email.
 * Body: { email?, recipientName?, language? }
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now();
  if (!isEmailServiceConfigured()) {
    return NextResponse.json(
      {
        error:
          'Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.',
      },
      { status: 503 }
    );
  }

  try {
    // Auth already done by Express adminAuth middleware — context forwarded via
    // x-admin-* headers (see backend/routes/admin/middleware.ts).
    const adminUserId = request.headers.get('x-admin-user-id');
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminEmail = request.headers.get('x-admin-email') || '';
    const adminUsername = request.headers.get('x-admin-username') || '';
    const adminDisplayName = request.headers.get('x-admin-display-name') || '';

    let body: { email?: string; recipientName?: string; language?: string } = {};
    try {
      body = await request.json();
    } catch {
      // empty body allowed
    }

    const targetEmail = body.email || adminEmail;
    if (!targetEmail) {
      return NextResponse.json({ error: 'No email address provided' }, { status: 400 });
    }

    const recipientName =
      body.recipientName || adminDisplayName || adminUsername || 'Test User';

    const language = ALLOWED_LANGUAGES.includes(body.language ?? '')
      ? (body.language as string)
      : 'en';

    const result = await sendTestAndroidReleaseLaunch(
      targetEmail,
      recipientName,
      language
    );
    logger.info(
      'EMAIL',
      `[android-release-route] test send-done success=${result.success} total=${Date.now() - t0}ms`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test Android release email sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/send-test-android-release-launch',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
