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
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, display_name, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      return NextResponse.json({
        error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.',
      }, { status: 503 });
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

    // Send the test email
    const result = await sendTestEmail(targetEmail, recipientName);

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Failed to send test email',
      }, { status: 500 });
    }

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
