import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendAndroidBetaLaunchToPlayer } from '@/lib/androidBetaLaunchEmail';
import { isEmailServiceConfigured, withTimeout } from '@/lib/email';
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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'Auth lookup timed out after 5s'
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await withTimeout(
      Promise.resolve(
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
      ),
      5000,
      'Profile lookup timed out after 5s'
    );

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
