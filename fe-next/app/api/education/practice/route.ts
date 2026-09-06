import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { z } from 'zod';
import logger from '@/utils/logger';
import { calculatePracticeXp, type PracticeSessionXp } from '@/backend/modules/educationXpManager';
import { updateEducationChallengeProgress } from '@/lib/supabase/education/challengeProgress';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';

function tooManyRequests(retryAfter: number | undefined) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
  );
}

// Validation schemas
const practiceTypeSchema = z.enum(['flashcard', 'solo_board', 'warmup', 'word_list', 'matching', 'spelling', 'blitz', 'vocab_focus']);
const vocabFocusSchema = z.enum(VOCAB_FOCUSES as [string, ...string[]]);

const startSessionSchema = z.object({
  lessonId: z.string().uuid(),
  practiceType: practiceTypeSchema,
  // vocab_focus only — which skill is drilled; persisted in `mode` + `results.focus`
  focus: vocabFocusSchema.optional(),
});

const updateSessionSchema = z.object({
  sessionId: z.string().uuid(),
  // Flashcard updates
  cardsReviewed: z.number().min(0).optional(),
  cardsCorrect: z.number().min(0).optional(),
  // Board practice updates
  wordsFound: z.array(z.string()).optional(),
  vocabularyWordsFound: z.array(z.string()).optional(),
  totalScore: z.number().min(0).optional(),
  // New practice modes (Phase 37)
  wordsAttempted: z.number().min(0).optional(),
  wordsCorrect: z.number().min(0).optional(),
  accuracy: z.number().min(0).max(1).optional(),
  maxCombo: z.number().min(0).optional(),
  // xpAwarded removed (B7 fix) — server always computes XP, never trusts client
  // Common
  timeSpentSeconds: z.number().min(0).optional(),
  completed: z.boolean().optional(),
});

const getProgressSchema = z.object({
  lessonId: z.string().uuid(),
  studentId: z.string().uuid().optional(), // For teachers viewing student progress
});

/**
 * GET /api/education/practice
 * Get practice sessions or progress
 * Query params:
 *   - sessionId: Get specific session
 *   - lessonId: Get all sessions for a lesson
 *   - progress: If true, get aggregated progress
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const lessonId = searchParams.get('lessonId');
    const studentId = searchParams.get('studentId');
    const getProgress = searchParams.get('progress') === 'true';

    // Get single session by ID
    if (sessionId) {
      const { data: session, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        logger.error('Error fetching session:', error);
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Verify ownership (student or teacher of the lesson)
      if (session.student_id !== user.id) {
        const { data: lesson } = await supabase
          .from('vocabulary_lessons')
          .select('teacher_id')
          .eq('id', session.lesson_id)
          .single();

        if (!lesson || lesson.teacher_id !== user.id) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
      }

      return NextResponse.json({ session });
    }

    // Get progress or sessions for a lesson
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    // Determine whose sessions to fetch
    const targetStudentId = studentId || user.id;

    // If viewing another student's data, verify teacher access
    if (studentId && studentId !== user.id) {
      const { data: lesson } = await supabase
        .from('vocabulary_lessons')
        .select('teacher_id')
        .eq('id', lessonId)
        .single();

      if (!lesson || lesson.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized to view student data' }, { status: 403 });
      }
    }

    // Get aggregated progress
    if (getProgress) {
      const { data: progress, error } = await supabase
        .from('student_practice_progress')
        .select('*')
        .eq('student_id', targetStudentId)
        .eq('lesson_id', lessonId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        logger.error('Error fetching progress:', error);
        return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
      }

      // Get mastery level
      const { data: masteryResult } = await supabase
        .rpc('calculate_lesson_mastery', {
          p_student_id: targetStudentId,
          p_lesson_id: lessonId,
        });

      return NextResponse.json({
        progress: progress || {
          student_id: targetStudentId,
          lesson_id: lessonId,
          total_flashcards_reviewed: 0,
          total_flashcards_correct: 0,
          total_practice_score: 0,
          total_vocabulary_words_found: 0,
          flashcard_sessions: 0,
          solo_board_sessions: 0,
          warmup_sessions: 0,
          word_list_views: 0,
          matching_sessions: 0,
          spelling_sessions: 0,
          blitz_sessions: 0,
          total_practice_time_seconds: 0,
          last_practice_at: null,
        },
        mastery: masteryResult || 'not_started',
      });
    }

    // Get all sessions for the lesson
    const { data: sessions, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('student_id', targetStudentId)
      .eq('lesson_id', lessonId)
      .order('started_at', { ascending: false });

    if (error) {
      logger.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    logger.error('GET practice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/education/practice
 * Start a new practice session
 */
export async function POST(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'education-practice', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!limit.success) return tooManyRequests(limit.retryAfter);

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = startSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { lessonId, practiceType, focus } = parseResult.data;

    // Verify student has access to this lesson (assigned via classroom membership)
    const { data: hasAccess } = await supabase
      .from('lesson_assignments')
      .select(`
        id,
        classroom:classrooms!inner(
          id,
          members:classroom_memberships!inner(student_id)
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('classroom.members.student_id', user.id)
      .limit(1)
      .single();

    // Also check if user is the teacher (they can practice their own lessons)
    const { data: lesson } = await supabase
      .from('vocabulary_lessons')
      .select('teacher_id')
      .eq('id', lessonId)
      .single();

    if (!hasAccess && lesson?.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to practice this lesson' },
        { status: 403 }
      );
    }

    // Create practice session. Targeted vocab practice also records WHICH
    // skill was drilled (mode + results JSON) so teachers can see it later.
    const insertData: Record<string, unknown> = {
      student_id: user.id,
      lesson_id: lessonId,
      practice_type: practiceType,
    };
    if (practiceType === 'vocab_focus' && focus) {
      insertData.mode = practiceType;
      insertData.results = { focus };
    }
    const { data: session, error } = await supabase
      .from('practice_sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating practice session:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    logger.error('POST practice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/education/practice
 * Update a practice session (progress, completion)
 */
export async function PATCH(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'education-practice', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!limit.success) return tooManyRequests(limit.retryAfter);

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = updateSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { sessionId, completed, ...updateData } = parseResult.data;

    // Verify user owns the session + idempotency guard.
    // PERF: the extra columns are exactly the ones the completion path needs to
    // score the session. Reading them here (same round trip as the ownership
    // check) is what lets the handler compute xp_awarded BEFORE the write, so
    // completion is one write instead of two.
    const { data: existing, error: existingError } = await supabase
      .from('practice_sessions')
      .select(
        'id, student_id, lesson_id, completed_at, practice_type, mode, cards_reviewed, cards_correct, vocabulary_words_found, words_found, words_correct, words_attempted, max_combo'
      )
      .eq('id', sessionId)
      .eq('student_id', user.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Session not found or not authorized' },
        { status: 403 }
      );
    }

    // Idempotency guard: if already completed, return existing session without re-awarding XP.
    // Only the three guard columns are returned — the wider select above is an
    // internal optimisation and must not change this response shape.
    if (existing.completed_at) {
      return NextResponse.json({
        session: {
          id: existing.id,
          student_id: existing.student_id,
          completed_at: existing.completed_at,
        },
      });
    }

    // Build update object with snake_case keys
    const updateObj: Record<string, unknown> = {};
    if (updateData.cardsReviewed !== undefined) updateObj.cards_reviewed = updateData.cardsReviewed;
    if (updateData.cardsCorrect !== undefined) updateObj.cards_correct = updateData.cardsCorrect;
    if (updateData.wordsFound !== undefined) updateObj.words_found = updateData.wordsFound;
    if (updateData.vocabularyWordsFound !== undefined) updateObj.vocabulary_words_found = updateData.vocabularyWordsFound;
    if (updateData.totalScore !== undefined) updateObj.total_score = updateData.totalScore;
    if (updateData.wordsAttempted !== undefined) updateObj.words_attempted = updateData.wordsAttempted;
    if (updateData.wordsCorrect !== undefined) updateObj.words_correct = updateData.wordsCorrect;
    if (updateData.accuracy !== undefined) updateObj.accuracy = updateData.accuracy;
    if (updateData.maxCombo !== undefined) updateObj.max_combo = updateData.maxCombo;
    if (updateData.timeSpentSeconds !== undefined) updateObj.time_spent_seconds = updateData.timeSpentSeconds;
    if (completed) updateObj.completed_at = new Date().toISOString();

    // Server-side XP recalculation (H3 fix: never trust client-supplied xpAwarded).
    // PERF: scored from the MERGED row (what the session will look like after the
    // write) rather than from the write's return value, so xp_awarded goes into
    // the same UPDATE instead of costing a second write to the same row.
    let serverCalculatedXp = 0;
    let streakDays = 0;

    if (completed) {
      const merged = { ...existing, ...updateObj } as typeof existing & Record<string, unknown>;
      const practiceType = merged.practice_type || merged.mode;
      const xpType = practiceType === 'solo_board' ? 'solo_board'
        : practiceType === 'warmup' ? 'solo_board'
        : practiceType === 'flashcard' ? 'flashcard'
        : practiceType === 'matching' ? 'matching'
        : practiceType === 'spelling' ? 'spelling'
        : practiceType === 'blitz' ? 'blitz'
        : practiceType === 'vocab_focus' ? 'flashcard' // 4-choice quiz → cards reviewed/correct
        : 'flashcard';

      const xpSession: PracticeSessionXp = {
        type: xpType,
        sessionData: {
          cardsReviewed: merged.cards_reviewed,
          cardsCorrect: merged.cards_correct,
          vocabularyWordsFound: merged.vocabulary_words_found || [],
          pairsMatched: merged.words_correct,
          totalPairs: merged.words_attempted,
          wordsSpelled: merged.words_correct,
          spellingStreak: merged.max_combo || 0,
          blitzWordsFound: merged.words_correct || (merged.words_found?.length ?? 0),
          blitzMaxCombo: merged.max_combo || 0,
        },
      };

      // B1 fix: Fetch student's current streak for streak bonus calculation
      const { data: progressData } = await supabase
        .from('student_lesson_progress')
        .select('current_streak')
        .eq('student_id', existing.student_id)
        .eq('lesson_id', existing.lesson_id)
        .single();

      streakDays = progressData?.current_streak ?? 0;
      serverCalculatedXp = calculatePracticeXp({ ...xpSession, streakDays }).totalXp;

      // Always write server-calculated XP (even if 0) to prevent client value sticking (B7 fix)
      updateObj.xp_awarded = serverCalculatedXp;
    }

    // PERF: the session write and the two XP RPCs write to three independent
    // tables and none of them reads another's result, so they travel as ONE
    // round trip instead of three.
    // Trade-off, deliberate: if the session write fails while the RPCs succeed,
    // a client retry re-awards XP (award_education_xp and increment_player_xp are
    // blind increments, not idempotent). Previously the write was awaited first so
    // that could not happen. It needs the write to fail on a row whose ownership
    // SELECT succeeded milliseconds earlier.
    const sessionWrite = supabase
      .from('practice_sessions')
      .update(updateObj)
      .eq('id', sessionId)
      .select('*')
      .single();

    const shouldAwardXp = Boolean(completed) && serverCalculatedXp > 0;

    const awardEducationXp = shouldAwardXp
      ? Promise.resolve(
          supabase.rpc('award_education_xp', {
            p_student_id: existing.student_id,
            p_xp_amount: serverCalculatedXp,
            p_lesson_id: existing.lesson_id,
          })
        )
      : Promise.resolve(null);

    // BUG-02 fix: also bump global profile XP (single server-owned write path).
    // Previously the client called /api/education/record-xp separately, double-counting profile XP.
    const incrementProfileXp = shouldAwardXp
      ? Promise.resolve(
          supabase.rpc('increment_player_xp', {
            p_player_id: existing.student_id,
            p_xp_amount: serverCalculatedXp,
          })
        )
      : Promise.resolve(null);

    const [{ data: session, error }, xpResult, profileXpResult] = await Promise.all([
      sessionWrite,
      awardEducationXp,
      incrementProfileXp,
    ]);

    if (error) {
      logger.error('Error updating session:', error);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    if (shouldAwardXp) {
      if (xpResult?.error) {
        logger.error('Failed to award education XP:', xpResult.error);
      } else {
        logger.info(
          'EDUCATION',
          `Awarded ${serverCalculatedXp} XP (server-calculated, streak=${streakDays}d) to student ${existing.student_id} for lesson ${existing.lesson_id}`
        );
      }

      if (profileXpResult?.error) {
        logger.error('Failed to increment profile XP:', profileXpResult.error);
      }
    }

    if (completed) {
      // B12 fix: Update daily challenge progress after practice completion
      // Fire-and-forget — don't block the response
      updateEducationChallengeProgress(existing.student_id, 'practice_session', 1).catch(err =>
        logger.error('Failed to update challenge progress:', err)
      );
      if (serverCalculatedXp > 0) {
        updateEducationChallengeProgress(existing.student_id, 'xp_earned', serverCalculatedXp).catch(err =>
          logger.error('Failed to update XP challenge progress:', err)
        );
      }
    }

    return NextResponse.json({ session });
  } catch (error) {
    logger.error('PATCH practice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
