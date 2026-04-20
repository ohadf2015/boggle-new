import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendTestAndroidBetaLaunch } from '@/lib/androidBetaLaunchEmail';
import { isEmailServiceConfigured } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * POST /api/admin/send-test-android-beta-launch
 * Admin-only. Sends a [TEST] Android closed beta launch email.
 * Body: { email?, recipientName?, language? }
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
      body.recipientName ||
      profile.display_name ||
      profile.username ||
      'Test User';

    const language = ALLOWED_LANGUAGES.includes(body.language ?? '')
      ? (body.language as string)
      : 'en';

    const result = await sendTestAndroidBetaLaunch(
      targetEmail,
      recipientName,
      language
    );

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
