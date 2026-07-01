/**
 * Adventure Level Attempt API
 *
 * POST - Record a level attempt (including failed attempts)
 * GET - Fetch attempts for the current user
 *
 * This enables the "Partial Progress" UX feature, showing players
 * their best metrics even when they haven't completed a level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';

/**
 * Validate attempt request body
 */
function validateAttemptBody(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: {
    world: number;
    level: number;
    words: number;
    score: number;
    timeRemaining: number;
    objectiveProgress: Record<string, number>;
    isCompletion: boolean;
  };
} {
  const { world, level, words, score, timeRemaining, objectiveProgress, isCompletion } = body;

  // Check required fields
  if (
    typeof world !== 'number' ||
    typeof level !== 'number' ||
    typeof words !== 'number' ||
    typeof score !== 'number' ||
    typeof timeRemaining !== 'number'
  ) {
    return { valid: false, error: 'Missing required fields: world, level, words, score, timeRemaining' };
  }

  // Validate world range (0 = endless mode, 1-10 = story mode)
  if (world < 0 || world > 10) {
    return { valid: false, error: 'Invalid world: must be between 0 and 10' };
  }

  // Validate level range (1-7 for story mode, unbounded for endless world=0)
  if (world === 0) {
    if (level < 1) {
      return { valid: false, error: 'Invalid endless floor: must be >= 1' };
    }
  } else if (level < 1 || level > 7) {
    return { valid: false, error: 'Invalid level: must be between 1 and 7' };
  }

  // Validate non-negative values
  if (words < 0 || score < 0 || timeRemaining < 0) {
    return { valid: false, error: 'Invalid values: words, score, timeRemaining must be non-negative' };
  }

  // Validate objective progress is an object
  const validObjectiveProgress =
    typeof objectiveProgress === 'object' &&
    objectiveProgress !== null &&
    !Array.isArray(objectiveProgress)
      ? (objectiveProgress as Record<string, number>)
      : {};

  return {
    valid: true,
    data: {
      world,
      level,
      words,
      score,
      timeRemaining,
      objectiveProgress: validObjectiveProgress,
      isCompletion: typeof isCompletion === 'boolean' ? isCompletion : false,
    },
  };
}

/**
 * POST /api/adventure/attempt
 * Record a level attempt with partial progress
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-attempt', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateAttemptBody(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { world, level, words, score, timeRemaining, objectiveProgress, isCompletion } = validation.data;

    // Call the upsert function
    const { data: attempt, error: attemptError } = await supabase.rpc(
      'record_level_attempt',
      {
        p_user_id: userId,
        p_world: world,
        p_level: level,
        p_words: words,
        p_score: score,
        p_time_remaining: timeRemaining,
        p_objective_progress: objectiveProgress,
        p_is_completion: isCompletion,
      }
    );

    if (attemptError) {
      console.error('[ADVENTURE ATTEMPT API] Record attempt error:', attemptError);
      // Check for common database issues
      if (attemptError.code === '42883') {
        // Function does not exist - migration not applied
        console.error('[ADVENTURE ATTEMPT API] record_level_attempt function not found - run migration 059');
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
      }
      if (attemptError.code === '42P01') {
        // Table does not exist - migration not applied
        console.error('[ADVENTURE ATTEMPT API] level_attempts table not found - run migration 059');
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 });
    }

    const posthog = getPostHogServer();
    const eventName = isCompletion ? 'adventure_level_completed' : 'adventure_level_attempted';
    posthog?.capture({
      distinctId: userId,
      event: eventName,
      properties: {
        world,
        level,
        words_found: words,
        score,
        time_remaining: timeRemaining,
        attempt_count: attempt.attempt_count,
        consecutive_failures_before: isCompletion ? attempt.consecutive_failures : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      attempt: {
        world: attempt.world,
        level: attempt.level,
        bestWords: attempt.best_words,
        bestScore: attempt.best_score,
        bestTimeRemaining: attempt.best_time_remaining,
        objectiveProgress: attempt.objective_progress,
        attemptCount: attempt.attempt_count,
        consecutiveFailures: attempt.consecutive_failures,
        lastAttemptAt: attempt.last_attempt_at,
      },
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/attempt', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE ATTEMPT API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/adventure/attempt
 * Fetch all attempts for the current user
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-attempt-get', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    // Local JWT verify (~1ms) instead of a 50-200ms auth.getUser() round-trip.
    // Read-only GET; POST (records attempts) keeps remote verify.
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await createClient();

    const userId = user.id;

    // Fetch all attempts for user
    const { data: attempts, error: fetchError } = await supabase
      .from('level_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('world', { ascending: true })
      .order('level', { ascending: true });

    if (fetchError) {
      console.error('[ADVENTURE ATTEMPT API] Fetch attempts error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
    }

    // Transform to camelCase
    const transformedAttempts = (attempts || []).map((a) => ({
      world: a.world,
      level: a.level,
      bestWords: a.best_words,
      bestScore: a.best_score,
      bestTimeRemaining: a.best_time_remaining,
      objectiveProgress: a.objective_progress,
      attemptCount: a.attempt_count,
      consecutiveFailures: a.consecutive_failures,
      firstAttemptAt: a.first_attempt_at,
      lastAttemptAt: a.last_attempt_at,
    }));

    return NextResponse.json({
      success: true,
      attempts: transformedAttempts,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/attempt', { method: 'GET' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE ATTEMPT API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
