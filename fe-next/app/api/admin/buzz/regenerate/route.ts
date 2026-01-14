/**
 * Admin API: Regenerate Single Buzz Challenge
 * POST /api/admin/buzz/regenerate
 *
 * Regenerates a single challenge with admin feedback.
 * Stores feedback in buzz_prompt_examples for future AI improvements.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import {
  regenerateSingleChallenge,
  storePromptExample,
} from '@/backend/services/buzzGenerator';

// AI generation can take time
export const maxDuration = 60;

interface RegenerateRequestBody {
  date: string;
  language: string;
  challengeIndex: number;
  feedback: string;
  originalChallenge?: {
    type: string;
    prompt: string;
    answer: string;
    trend_topic?: string;
  };
  saveFeedback?: boolean;
}

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  let body: RegenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const {
    date,
    language,
    challengeIndex,
    feedback,
    originalChallenge,
    saveFeedback = true,
  } = body;

  // Validation
  if (!date || !language || challengeIndex === undefined || !feedback) {
    return NextResponse.json(
      { error: 'Missing required fields: date, language, challengeIndex, feedback' },
      { status: 400 }
    );
  }

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

  // Validate challenge index
  if (typeof challengeIndex !== 'number' || challengeIndex < 0) {
    return NextResponse.json(
      { error: 'challengeIndex must be a non-negative number' },
      { status: 400 }
    );
  }

  // Validate feedback
  if (typeof feedback !== 'string' || feedback.trim().length < 5) {
    return NextResponse.json(
      { error: 'Feedback must be at least 5 characters' },
      { status: 400 }
    );
  }

  try {
    // 1. Store the feedback example (before regeneration) for AI learning
    if (saveFeedback && originalChallenge) {
      try {
        await storePromptExample(
          language,
          originalChallenge.type,
          originalChallenge.prompt,
          originalChallenge.answer,
          feedback.trim(),
          authResult.user!.id,
          originalChallenge.trend_topic
        );
        console.log(`[Admin Buzz] Stored feedback for ${language}/${originalChallenge.type}`);
      } catch (storeError) {
        // Log but don't fail - regeneration is more important
        console.error('[Admin Buzz] Failed to store feedback:', storeError);
      }
    }

    // 2. Regenerate the challenge
    const updatedData = await regenerateSingleChallenge(
      date,
      language,
      challengeIndex,
      feedback.trim()
    );

    return NextResponse.json({
      success: true,
      message: 'Challenge regenerated successfully',
      data: updatedData,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Regeneration error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
