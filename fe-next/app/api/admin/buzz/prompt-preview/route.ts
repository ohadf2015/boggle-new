/**
 * Admin API: Preview Buzz Regeneration Prompt
 * GET /api/admin/buzz/prompt-preview
 *
 * Returns the AI prompt that would be sent for regeneration, along with
 * available "do not do" examples. Allows admins to preview/edit before sending.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import {
  getPromptPreview,
  getPromptExamples,
  type RegenerableField,
} from '@/backend/services/buzzGenerator';

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];
const VALID_FIELDS: RegenerableField[] = ['prompt', 'answer', 'hint', 'options', 'all'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const language = searchParams.get('language');
  const challengeIndexParam = searchParams.get('challengeIndex');
  const feedback = searchParams.get('feedback') || 'Needs improvement';
  const fieldsParam = searchParams.get('fields'); // comma-separated: "prompt,hint"

  // Validate required params
  if (!date || !language || challengeIndexParam === null) {
    return NextResponse.json(
      { error: 'Missing required params: date, language, challengeIndex' },
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

  // Parse challengeIndex
  const challengeIndex = parseInt(challengeIndexParam, 10);
  if (isNaN(challengeIndex) || challengeIndex < 0) {
    return NextResponse.json(
      { error: 'challengeIndex must be a non-negative integer' },
      { status: 400 }
    );
  }

  // Parse fields to regenerate
  let fieldsToRegenerate: RegenerableField[] = ['all'];
  if (fieldsParam) {
    const fields = fieldsParam.split(',').map(f => f.trim()) as RegenerableField[];
    for (const field of fields) {
      if (!VALID_FIELDS.includes(field)) {
        return NextResponse.json(
          { error: `Invalid field: ${field}. Valid fields: ${VALID_FIELDS.join(', ')}` },
          { status: 400 }
        );
      }
    }
    fieldsToRegenerate = fields;
  }

  try {
    // Get the prompt preview
    const { prompt, examples } = await getPromptPreview(
      date,
      language,
      challengeIndex,
      feedback,
      fieldsToRegenerate
    );

    // Format examples for UI display
    const formattedExamples = examples.map((ex, idx) => ({
      id: `example-${idx}`,
      challengeType: ex.challenge_type,
      originalPrompt: ex.original_prompt,
      originalAnswer: ex.original_answer,
      feedback: ex.feedback,
      improvedPrompt: ex.improved_prompt,
      improvedAnswer: ex.improved_answer,
      trendTopic: ex.trend_topic,
      isIncluded: idx < 10, // First 10 are included by default
    }));

    return NextResponse.json({
      success: true,
      data: {
        aiPrompt: prompt,
        availableExamples: formattedExamples,
        selectedExampleCount: Math.min(examples.length, 10),
        fieldsToRegenerate,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Prompt preview error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
