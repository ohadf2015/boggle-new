/**
 * Admin API: Mark Challenge as Bad
 * POST /api/admin/buzz/challenges/mark-bad - Store feedback for a bad challenge
 *
 * This endpoint stores admin feedback about a challenge that should be avoided.
 * The feedback is automatically included in future AI prompts to prevent
 * similar mistakes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import { storePromptExample } from '@/backend/services/buzz';
import type { MarkAsBadRequest } from '@/components/admin/buzz/types';
import { createClient } from '@supabase/supabase-js';

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

async function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST: Mark a challenge as bad with feedback
 *
 * Body:
 *   - date: Date of the daily buzz (YYYY-MM-DD)
 *   - language: Language code
 *   - challengeIndex: Index of the challenge in the challenges array
 *   - feedback: Admin's feedback explaining what's wrong
 *
 * This does NOT regenerate the challenge - just stores the feedback
 * for future AI prompt improvement.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  let body: MarkAsBadRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { date, language, challengeIndex, feedback } = body;

  // Validate required fields
  if (!date || !language || challengeIndex === undefined || !feedback) {
    return NextResponse.json(
      { error: 'Missing required fields: date, language, challengeIndex, feedback' },
      { status: 400 }
    );
  }

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(language as (typeof SUPPORTED_LANGUAGES)[number])) {
    return NextResponse.json(
      { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
      { status: 400 }
    );
  }

  // Validate challengeIndex
  if (typeof challengeIndex !== 'number' || challengeIndex < 0) {
    return NextResponse.json(
      { error: 'challengeIndex must be a non-negative number' },
      { status: 400 }
    );
  }

  // Validate feedback
  if (typeof feedback !== 'string' || feedback.trim().length < 10) {
    return NextResponse.json(
      { error: 'Feedback must be at least 10 characters' },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseClient();

    // Fetch the challenge data from daily_buzz
    const { data: buzzData, error: fetchError } = await supabase
      .from('daily_buzz')
      .select('challenges')
      .eq('puzzle_date', date)
      .eq('language', language)
      .single();

    if (fetchError) {
      console.error('[Admin Buzz] Error fetching buzz data:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch challenge data' },
        { status: 404 }
      );
    }

    if (!buzzData?.challenges || !Array.isArray(buzzData.challenges)) {
      return NextResponse.json(
        { error: 'No challenges found for this date/language' },
        { status: 404 }
      );
    }

    if (challengeIndex >= buzzData.challenges.length) {
      return NextResponse.json(
        { error: `Challenge index ${challengeIndex} out of range (max: ${buzzData.challenges.length - 1})` },
        { status: 400 }
      );
    }

    const challenge = buzzData.challenges[challengeIndex];
    const userId = authResult.user?.id || 'admin';

    // Store the feedback as a prompt example
    await storePromptExample(
      language,
      challenge.type || 'unknown',
      challenge.prompt || '',
      challenge.answer || '',
      feedback.trim(),
      userId,
      challenge.trend_topic
    );

    console.log(
      `[Admin Buzz] Marked challenge as bad: ${date}/${language}[${challengeIndex}] - ${challenge.type}`
    );

    return NextResponse.json({
      success: true,
      message: 'Challenge marked as bad and feedback stored',
      data: {
        date,
        language,
        challengeIndex,
        challengeType: challenge.type,
        trendTopic: challenge.trend_topic,
        feedbackStored: true,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error marking challenge as bad:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/challenges/mark-bad',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
