import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  sendTestGameModeAnnouncement,
  type GameModeKey,
} from '@/lib/gameModeAnnouncementEmail';
import { isEmailServiceConfigured } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

export const maxDuration = 60;

const ALLOWED_MODES: GameModeKey[] = ['blast', 'wordhunt', 'adventure'];
const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * POST /api/admin/send-test-game-mode-announcement
 * Send a [TEST] game-mode announcement email.
 * Admin-only.
 *
 * Body: {
 *   email?: string
 *   recipientName?: string
 *   language?: string   (default: en)
 *   mode?: GameModeKey  (default: blast)
 * }
 */
export async function POST(request: NextRequest) {
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
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, display_name, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    let body: {
      email?: string;
      recipientName?: string;
      language?: string;
      mode?: string;
    } = {};
    try {
      body = await request.json();
    } catch {
      // empty body allowed
    }

    const targetEmail = body.email || user.email;
    if (!targetEmail) {
      return NextResponse.json(
        { error: 'No email address provided' },
        { status: 400 }
      );
    }

    const recipientName =
      body.recipientName || profile.display_name || profile.username || 'Test User';

    const language = ALLOWED_LANGUAGES.includes(body.language ?? '')
      ? (body.language as string)
      : 'en';

    const mode: GameModeKey = ALLOWED_MODES.includes(body.mode as GameModeKey)
      ? (body.mode as GameModeKey)
      : 'blast';

    const result = await sendTestGameModeAnnouncement(
      targetEmail,
      recipientName,
      language,
      mode
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test ${mode} announcement sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/send-test-game-mode-announcement',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
