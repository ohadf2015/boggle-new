/**
 * Admin API: Regenerate Buzz Challenge(s)
 * POST /api/admin/buzz/regenerate
 *
 * Supports two modes:
 * 1. Single challenge: Provide challengeIndex to regenerate one specific challenge
 * 2. By type: Provide challengeType to regenerate all challenges of that type
 *
 * Stores feedback in buzz_prompt_examples for future AI improvements.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import {
  regenerateSingleChallenge,
  regenerateChallengesByType,
  regeneratePartialChallenge,
  storePromptExample,
  type RegenerableField,
  type PartialRegenerationOptions,
} from '@/backend/services/buzzGenerator';

// AI generation can take time - increased to 70s to accommodate timeout handling
// The buzzGenerator has a 50s internal timeout, so 70s gives buffer for response processing
export const maxDuration = 70;

interface RegenerateRequestBody {
  date: string;
  language: string;
  challengeIndex?: number; // For single challenge mode
  challengeType?: string; // For by-type mode (e.g., 'wordle_guess', 'anagram')
  feedback: string;
  originalChallenge?: {
    type: string;
    prompt: string;
    answer: string;
    trend_topic?: string;
  };
  saveFeedback?: boolean;
  // Partial regeneration fields
  fieldsToRegenerate?: RegenerableField[]; // Which fields to regenerate (default: ['all'])
  customPromptOverride?: string; // Admin-edited AI prompt
}

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

const VALID_CHALLENGE_TYPES = [
  'anagram',
  'fill_blank',
  'word_chain',
  'definition_match',
  'trending_trio',
  'riddle',
  'wordle_guess',
];

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
    challengeType,
    feedback,
    originalChallenge,
    saveFeedback = true,
    fieldsToRegenerate = ['all'],
    customPromptOverride,
  } = body;

  // Base validation
  if (!date || !language || !feedback) {
    return NextResponse.json(
      { error: 'Missing required fields: date, language, feedback' },
      { status: 400 }
    );
  }

  // Must provide either challengeIndex OR challengeType (but not both)
  if (challengeIndex === undefined && !challengeType) {
    return NextResponse.json(
      { error: 'Must provide either challengeIndex (for single challenge) or challengeType (for all of that type)' },
      { status: 400 }
    );
  }

  if (challengeIndex !== undefined && challengeType) {
    return NextResponse.json(
      { error: 'Cannot provide both challengeIndex and challengeType. Choose one mode.' },
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

  // Validate challengeIndex if provided
  if (challengeIndex !== undefined && (typeof challengeIndex !== 'number' || challengeIndex < 0)) {
    return NextResponse.json(
      { error: 'challengeIndex must be a non-negative number' },
      { status: 400 }
    );
  }

  // Validate challengeType if provided
  if (challengeType && !VALID_CHALLENGE_TYPES.includes(challengeType)) {
    return NextResponse.json(
      { error: `Invalid challengeType. Use: ${VALID_CHALLENGE_TYPES.join(', ')}` },
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

  // Validate fieldsToRegenerate if provided
  const validFields: RegenerableField[] = ['prompt', 'answer', 'hint', 'options', 'all'];
  if (!Array.isArray(fieldsToRegenerate) || fieldsToRegenerate.length === 0) {
    return NextResponse.json(
      { error: 'fieldsToRegenerate must be a non-empty array' },
      { status: 400 }
    );
  }
  for (const field of fieldsToRegenerate) {
    if (!validFields.includes(field)) {
      return NextResponse.json(
        { error: `Invalid field in fieldsToRegenerate: ${field}. Valid fields: ${validFields.join(', ')}` },
        { status: 400 }
      );
    }
  }

  // Validate customPromptOverride if provided
  if (customPromptOverride !== undefined && typeof customPromptOverride !== 'string') {
    return NextResponse.json(
      { error: 'customPromptOverride must be a string' },
      { status: 400 }
    );
  }

  try {
    // 1. Store the feedback example (before regeneration) for AI learning
    // Only store for single challenge mode where we have originalChallenge
    if (saveFeedback && originalChallenge && challengeIndex !== undefined) {
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

    // 2. Regenerate challenge(s) based on mode
    let updatedData;
    let message: string;

    // Determine if this is a partial regeneration (specific fields vs full)
    const isPartialRegeneration = !fieldsToRegenerate.includes('all');

    if (challengeIndex !== undefined) {
      // Single challenge mode
      if (isPartialRegeneration || customPromptOverride) {
        // Use partial regeneration for field-specific or custom prompt regeneration
        const options: PartialRegenerationOptions = {
          fields: fieldsToRegenerate,
          customPrompt: customPromptOverride,
        };
        updatedData = await regeneratePartialChallenge(
          date,
          language,
          challengeIndex,
          feedback.trim(),
          options
        );
        const fieldsList = fieldsToRegenerate.join(', ');
        message = isPartialRegeneration
          ? `Regenerated ${fieldsList} field(s) successfully`
          : 'Challenge regenerated with custom prompt successfully';
      } else {
        // Full regeneration - use existing function for backward compatibility
        updatedData = await regenerateSingleChallenge(
          date,
          language,
          challengeIndex,
          feedback.trim()
        );
        message = 'Challenge regenerated successfully';
      }
    } else {
      // By-type mode (always full regeneration)
      updatedData = await regenerateChallengesByType(
        date,
        language,
        challengeType!,
        feedback.trim()
      );
      const count = updatedData.challenges.filter(c => c.type === challengeType).length;
      message = `Regenerated ${count} ${challengeType} challenge(s) successfully`;
    }

    return NextResponse.json({
      success: true,
      message,
      data: updatedData,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Regeneration error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/regenerate',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
