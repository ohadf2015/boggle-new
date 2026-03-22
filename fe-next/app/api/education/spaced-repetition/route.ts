import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import {
  calculateNextReview,
  createWordReviewData,
  type WordReviewData,
} from '@/lib/utils/spacedRepetition';
import logger from '@/utils/logger';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const recordReviewSchema = z.object({
  lessonId: z.string().uuid(),
  word: z.string().min(1),
  quality: z.number().int().min(0).max(5),
});

// ============================================
// HELPERS
// ============================================

function dbRowToReviewData(row: {
  word: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_review_date: string;
}): WordReviewData {
  return {
    word: row.word,
    easeFactor: Number(row.ease_factor),
    interval: row.interval,
    repetitions: row.repetitions,
    nextReviewDate: row.next_review_date,
    lastReviewDate: row.last_review_date,
  };
}

// ============================================
// GET — Fetch review schedule for a lesson
// ============================================

/**
 * GET /api/education/spaced-repetition?lessonId=xxx
 * Returns all review data for the authenticated student's lesson.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lessonId = new URL(request.url).searchParams.get('lessonId');
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('word_review_state')
      .select('word, ease_factor, interval, repetitions, next_review_date, last_review_date')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId);

    if (error) {
      logger.error('Error fetching review state:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    const reviews = (data || []).map(dbRowToReviewData);
    return NextResponse.json({ reviews });
  } catch (err) {
    logger.error('GET spaced-repetition error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// PATCH — Record a review result
// ============================================

/**
 * PATCH /api/education/spaced-repetition
 * Records a review result and updates the SM-2 schedule.
 * Body: { lessonId, word, quality: 0-5 }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = recordReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { lessonId, word, quality } = parseResult.data;

    // Fetch existing review data (may not exist yet)
    const { data: existing } = await supabase
      .from('word_review_state')
      .select('word, ease_factor, interval, repetitions, next_review_date, last_review_date')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('word', word)
      .maybeSingle();

    // Calculate next review using SM-2
    const currentData = existing
      ? dbRowToReviewData(existing)
      : createWordReviewData(word);

    const updated = calculateNextReview(currentData, {
      quality: quality as 0 | 1 | 2 | 3 | 4 | 5,
    });

    // Upsert review state
    const { data: upserted, error: upsertError } = await supabase
      .from('word_review_state')
      .upsert(
        {
          student_id: user.id,
          lesson_id: lessonId,
          word: updated.word,
          ease_factor: updated.easeFactor,
          interval: updated.interval,
          repetitions: updated.repetitions,
          next_review_date: updated.nextReviewDate,
          last_review_date: updated.lastReviewDate,
        },
        { onConflict: 'student_id,lesson_id,word' }
      )
      .select('word, ease_factor, interval, repetitions, next_review_date, last_review_date')
      .single();

    if (upsertError) {
      logger.error('Error upserting review state:', upsertError);
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
    }

    const review = dbRowToReviewData(upserted);
    return NextResponse.json({ review });
  } catch (err) {
    logger.error('PATCH spaced-repetition error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
