import { NextRequest, NextResponse } from 'next/server';
import { sendAndroidBetaLaunchToPlayer } from '@/lib/androidBetaLaunchEmail';
import { isEmailServiceConfigured } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

export const maxDuration = 60;

/**
 * POST /api/admin/send-android-beta-launch-to-player
 * Admin-only. Sends a real Android beta launch email to a specific player.
 * Body: { playerIdentifier: string }
 */
export async function POST(request: NextRequest) {
  if (!isEmailServiceConfigured()) {
    return NextResponse.json(
      { error: 'Email service not configured' },
      { status: 503 }
    );
  }

  try {
    // Auth already done by Express adminAuth middleware — see header forwarding
    // in backend/routes/admin/middleware.ts.
    const adminUserId = request.headers.get('x-admin-user-id');
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerIdentifier } = body as { playerIdentifier?: string };

    if (!playerIdentifier) {
      return NextResponse.json(
        { error: 'playerIdentifier is required' },
        { status: 400 }
      );
    }

    const result = await sendAndroidBetaLaunchToPlayer(playerIdentifier);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Android beta launch email sent to ${result.sentTo}`,
      sentTo: result.sentTo,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/admin/send-android-beta-launch-to-player',
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
