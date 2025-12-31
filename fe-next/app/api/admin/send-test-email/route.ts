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
  console.log('[Admin] Send test email request received');

  // Check if email service is configured FIRST (fast check)
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

  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[Admin] Auth error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, display_name, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.log('[Admin] Not admin or profile error:', profileError?.message);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    let body: { email?: string; recipientName?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine - will use defaults
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

    console.log(`[Admin] Sending test email to ${targetEmail}`);

    // Send the test email
    const result = await sendTestEmail(targetEmail, recipientName);

    if (!result.success) {
      console.log('[Admin] Send failed:', result.error);
      return NextResponse.json({
        error: result.error || 'Failed to send test email',
      }, { status: 500 });
    }

    console.log(`[Admin] Test email sent successfully to ${targetEmail}`);
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    console.error('[Admin] Send test email error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
