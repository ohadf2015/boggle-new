import { NextRequest, NextResponse } from 'next/server';
import { isEmailServiceConfigured } from '@/lib/email';
import {
  sendTestReengagementEmail,
  getFirstLetterForLanguage,
} from '@/lib/reengagementEmail';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';

/**
 * POST /api/admin/send-test-reengagement
 * Send a test re-engagement email. Admin-only.
 *
 * Body: { email?: string, recipientName?: string, language?: string }
 */
export async function POST(request: NextRequest) {
  if (!isEmailServiceConfigured()) {
    return NextResponse.json({
      error: 'Email service not configured',
      details: { hasApiKey: !!process.env.RESEND_API_KEY, hasFromEmail: !!process.env.RESEND_FROM_EMAIL },
    }, { status: 503 });
  }

  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.success) return auth.response!;

    let body: { email?: string; recipientName?: string; language?: string } = {};
    try { body = await request.json(); } catch { /* empty body ok */ }

    const targetEmail = body.email || auth.user!.email;
    if (!targetEmail) {
      return NextResponse.json({ error: 'No email address provided' }, { status: 400 });
    }

    const language = body.language || 'en';
    const recipientName = body.recipientName || auth.user!.username || 'Test User';

    // Get real first letter for this language
    const letterData = await getFirstLetterForLanguage(language);
    const firstLetter = letterData?.letter || 'T';

    const result = await sendTestReengagementEmail(targetEmail, recipientName, language, firstLetter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test re-engagement email sent to ${targetEmail}`,
      sentTo: targetEmail,
      language,
      firstLetter,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/admin/send-test-reengagement',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
