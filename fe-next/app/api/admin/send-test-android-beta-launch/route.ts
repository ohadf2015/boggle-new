import { NextRequest, NextResponse } from 'next/server';
import { sendTestAndroidBetaLaunch } from '@/lib/androidBetaLaunchEmail';
import { isEmailServiceConfigured } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import logger from '@/backend/utils/logger';

const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

export const maxDuration = 60;

/**
 * POST /api/admin/send-test-android-beta-launch
 * Admin-only. Sends a [TEST] Android closed beta launch email.
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
    // Auth already done by Express adminAuth middleware (server/index.ts mounts
    // adminRoutes at /api/admin which applies adminAuth before falling through to
    // this Next route). It forwards admin context via x-admin-* headers, saving
    // a duplicate getUser+profile roundtrip (~1-2s).
    const adminUserId = request.headers.get('x-admin-user-id');
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminEmail = request.headers.get('x-admin-email') || '';
    const adminUsername = request.headers.get('x-admin-username') || '';
    const adminDisplayName = request.headers.get('x-admin-display-name') || '';
    logger.info('EMAIL', `[android-beta-route] auth-via-headers +${Date.now() - t0}ms`);

    let body: {
      email?: string;
      recipientName?: string;
      language?: string;
    } = {};
    try {
      body = await request.json();
    } catch {
      // empty body allowed
    }

    const targetEmail = body.email || adminEmail;
    if (!targetEmail) {
      return NextResponse.json(
        { error: 'No email address provided' },
        { status: 400 }
      );
    }

    const recipientName =
      body.recipientName ||
      adminDisplayName ||
      adminUsername ||
      'Test User';

    const language = ALLOWED_LANGUAGES.includes(body.language ?? '')
      ? (body.language as string)
      : 'en';

    logger.info('EMAIL', `[android-beta-route] send-start to=${targetEmail} lang=${language} +${Date.now() - t0}ms`);
    const result = await sendTestAndroidBetaLaunch(
      targetEmail,
      recipientName,
      language
    );
    logger.info('EMAIL', `[android-beta-route] send-done success=${result.success} total=${Date.now() - t0}ms`);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test Android beta launch email sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/send-test-android-beta-launch',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
