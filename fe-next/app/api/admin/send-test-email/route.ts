import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendTestEmail, isEmailServiceConfigured } from '@/lib/email';

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
  console.log('[Admin] ====== Send test email request START ======');

  // Check if email service is configured FIRST (fast check)
  console.log('[Admin] Step 1: Checking email config...');
  if (!isEmailServiceConfigured()) {
    console.log('[Admin] Email service not configured');
    return NextResponse.json({
      error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in your environment variables.',
      details: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
      }
    }, { status: 503 });
  }
  console.log('[Admin] Step 1 DONE: Email config OK', { elapsed: Date.now() - startTime });

  try {
    // Create Supabase client
    console.log('[Admin] Step 2: Creating Supabase client...');
    const supabase = await createClient();
    console.log('[Admin] Step 2 DONE: Supabase client created', { elapsed: Date.now() - startTime });

    // Check if user is authenticated
    console.log('[Admin] Step 3: Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[Admin] Step 3 DONE: getUser complete', { elapsed: Date.now() - startTime, hasUser: !!user, authError: authError?.message });

    if (authError || !user) {
      console.log('[Admin] Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    console.log('[Admin] Step 4: Checking admin status for user', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, display_name, username')
      .eq('id', user.id)
      .single();
    console.log('[Admin] Step 4 DONE: Profile fetched', { elapsed: Date.now() - startTime, isAdmin: profile?.is_admin, profileError: profileError?.message });

    if (profileError || !profile?.is_admin) {
      console.log('[Admin] Not admin or profile error:', profileError?.message);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    console.log('[Admin] Step 5: Parsing request body...');
    let body: { email?: string; recipientName?: string } = {};
    try {
      body = await request.json();
      console.log('[Admin] Step 5 DONE: Body parsed', { elapsed: Date.now() - startTime, body });
    } catch {
      console.log('[Admin] Step 5 DONE: Empty body (using defaults)', { elapsed: Date.now() - startTime });
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

    console.log('[Admin] Step 6: Sending test email...', { targetEmail, recipientName });

    // Send the test email
    const result = await sendTestEmail(targetEmail, recipientName);
    console.log('[Admin] Step 6 DONE: sendTestEmail returned', { elapsed: Date.now() - startTime, result });

    if (!result.success) {
      console.log('[Admin] Send failed:', result.error);
      return NextResponse.json({
        error: result.error || 'Failed to send test email',
      }, { status: 500 });
    }

    console.log('[Admin] ====== SUCCESS - Total time:', Date.now() - startTime, 'ms ======');
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    console.error('[Admin] ====== ERROR after', Date.now() - startTime, 'ms ======');
    console.error('[Admin] Error details:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
