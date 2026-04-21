import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { sendTestEmail, isEmailServiceConfigured } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

export const maxDuration = 60;

/**
 * POST /api/admin/send-test-email
 * Send a test daily challenge email to a specified address
 * Only accessible to admin users
 *
 * Body: {
 *   email?: string (defaults to admin's email)
 *   recipientName?: string (defaults to "Test User")
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  // Using console.warn because console.log is stripped in production
  logger.warn('[Admin] ====== Send test email request START ======');

  // Check if email service is configured FIRST (fast check)
  logger.warn('[Admin] Step 1: Checking email config...');
  if (!isEmailServiceConfigured()) {
    logger.warn('[Admin] Email service not configured');
    return NextResponse.json({
      error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in your environment variables.',
      details: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
      }
    }, { status: 503 });
  }
  logger.warn('[Admin] Step 1 DONE: Email config OK', { elapsed: Date.now() - startTime });

  try {
    // Create Supabase client
    logger.warn('[Admin] Step 2: Creating Supabase client...');
    const supabase = await createClient();
    logger.warn('[Admin] Step 2 DONE: Supabase client created', { elapsed: Date.now() - startTime });

    // Check if user is authenticated
    logger.warn('[Admin] Step 3: Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    logger.warn('[Admin] Step 3 DONE: getUser complete', { elapsed: Date.now() - startTime, hasUser: !!user, authError: authError?.message });

    if (authError || !user) {
      logger.warn('[Admin] Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    logger.warn('[Admin] Step 4: Checking admin status for user', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, display_name, username')
      .eq('id', user.id)
      .single();
    logger.warn('[Admin] Step 4 DONE: Profile fetched', { elapsed: Date.now() - startTime, isAdmin: profile?.is_admin, profileError: profileError?.message });

    if (profileError || !profile?.is_admin) {
      logger.warn('[Admin] Not admin or profile error:', profileError?.message);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    logger.warn('[Admin] Step 5: Parsing request body...');
    let body: { email?: string; recipientName?: string } = {};
    try {
      body = await request.json();
      logger.warn('[Admin] Step 5 DONE: Body parsed', { elapsed: Date.now() - startTime, body });
    } catch {
      logger.warn('[Admin] Step 5 DONE: Empty body (using defaults)', { elapsed: Date.now() - startTime });
    }

    // Use provided email or default to admin's email
    const targetEmail = body.email || user.email;
    if (!targetEmail) {
      return NextResponse.json({
        error: 'No email address provided and admin has no email',
      }, { status: 400 });
    }

    // Use provided name or default to admin's name
    const recipientName = body.recipientName || profile.display_name || profile.username || 'Test User';

    logger.warn('[Admin] Step 6: Sending test email...', { targetEmail, recipientName });

    // Send the test email
    const result = await sendTestEmail(targetEmail, recipientName);
    logger.warn('[Admin] Step 6 DONE: sendTestEmail returned', { elapsed: Date.now() - startTime, result });

    if (!result.success) {
      logger.warn('[Admin] Send failed:', result.error);
      return NextResponse.json({
        error: result.error || 'Failed to send test email',
      }, { status: 500 });
    }

    logger.warn('[Admin] ====== SUCCESS - Total time:', Date.now() - startTime, 'ms ======');
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('[Admin] ====== ERROR after', Date.now() - startTime, 'ms ======');
    logger.error('[Admin] Error details:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/send-test-email',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({
      error: errorMessage,
    }, { status: 500 });
  }
}
