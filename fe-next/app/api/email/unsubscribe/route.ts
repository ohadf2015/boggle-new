import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/email';

/**
 * GET /api/email/unsubscribe?token=xxx
 *
 * One-click unsubscribe endpoint for email links.
 * Validates the token and unsubscribes the user from daily challenge emails.
 *
 * Security: Uses secure random token stored in user's profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing unsubscribe token' },
      { status: 400 }
    );
  }

  // Validate token format (should be 64 hex characters)
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json(
      { error: 'Invalid unsubscribe token format' },
      { status: 400 }
    );
  }

  const result = await unsubscribeByToken(token);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to unsubscribe' },
      { status: 400 }
    );
  }

  // Redirect to unsubscribe confirmation page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/en/unsubscribe?success=true`);
}

/**
 * POST /api/email/unsubscribe
 *
 * Alternative unsubscribe endpoint for List-Unsubscribe-Post header.
 * Supports RFC 8058 one-click unsubscribe.
 */
export async function POST(request: NextRequest) {
  try {
    // Support both URL params and form body
    const { searchParams } = new URL(request.url);
    let token = searchParams.get('token');

    if (!token) {
      // Try to get from form body (RFC 8058 format)
      const formData = await request.formData().catch(() => null);
      if (formData) {
        token = formData.get('token') as string;
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Missing unsubscribe token' },
        { status: 400 }
      );
    }

    // Validate token format
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token format' },
        { status: 400 }
      );
    }

    const result = await unsubscribeByToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to unsubscribe' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from daily challenge emails',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Unsubscribe] Error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
