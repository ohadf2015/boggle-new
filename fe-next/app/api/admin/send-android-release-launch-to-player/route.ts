import { NextRequest, NextResponse } from 'next/server';
import { sendAndroidReleaseLaunchToPlayer } from '@/lib/androidReleaseLaunchEmail';
import { isEmailServiceConfigured } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

export const maxDuration = 60;

/**
 * POST /api/admin/send-android-release-launch-to-player
 * Admin-only. Sends a REAL Android release announcement email to one player.
 * Body: { playerIdentifier: string }
 */
export async function POST(request: NextRequest) {
  if (!isEmailServiceConfigured()) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  try {
    // Auth already done by Express adminAuth middleware (header forwarding).
    const adminUserId = request.headers.get('x-admin-user-id');
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerIdentifier } = body as { playerIdentifier?: string };

    if (!playerIdentifier) {
      return NextResponse.json({ error: 'playerIdentifier is required' }, { status: 400 });
    }

    const result = await sendAndroidReleaseLaunchToPlayer(playerIdentifier);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Android release email sent to ${result.sentTo}`,
      sentTo: result.sentTo,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/admin/send-android-release-launch-to-player',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Internal server error: ${error.message}`
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
