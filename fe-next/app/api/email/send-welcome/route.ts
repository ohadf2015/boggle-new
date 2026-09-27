import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { sendWelcomeEmailToUser } from '@/lib/welcomeEmail';

export const runtime = 'nodejs';

/**
 * POST /api/email/send-welcome
 *
 * Send a welcome email to the authenticated user.
 * Idempotent — multiple calls won't double-send (atomic database guard).
 *
 * Request body (optional):
 * {
 *   "locale": "en" | "he" | "sv" | "ja" | "es"  // optional language override
 * }
 *
 * Response: { sent: boolean, reason?: string, language?: string }
 */
export async function POST(request: NextRequest) {
  // Step 1: Verify authentication
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Step 2: Parse request body safely
  let locale: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.locale === 'string') {
      locale = body.locale;
    }
  } catch {
    // Body parse error, proceed with no locale override
  }

  // Step 3: Send welcome email
  const result = await sendWelcomeEmailToUser(user.id, {
    locale,
    email: user.email ?? undefined,
  });

  // Step 4: Return result
  return NextResponse.json(result);
}
