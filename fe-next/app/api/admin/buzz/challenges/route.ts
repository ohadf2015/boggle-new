/**
 * Admin API: Fetch Daily Buzz Challenges
 * GET /api/admin/buzz/challenges?date=YYYY-MM-DD&language=en
 *
 * Returns full challenge data for admin viewing/editing
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getDailyBuzz } from '@/backend/services/buzzGenerator';

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const language = searchParams.get('language') || 'en';

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json(
      { error: `Unsupported language. Use: ${SUPPORTED_LANGUAGES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const buzzData = await getDailyBuzz(date, language);

    if (!buzzData) {
      return NextResponse.json(
        { error: 'No challenge found for this date/language' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: buzzData,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error fetching challenges:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}
