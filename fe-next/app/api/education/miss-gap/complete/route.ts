/**
 * POST /api/education/miss-gap/complete — record a finished homework session.
 *
 * The homework link is a SHARE link: it carries a lesson name, a teacher name
 * and the missed words, and nothing else. There is no classroom row behind it
 * and the student may have no account at all. So identity here is deliberately
 * light: `classKey` (`lesson::teacher`, already the share link's own key) plus a
 * student key — the auth user id for a member, a device-generated id for a guest.
 * Only a display name is stored. No email, no roster, no classroom join.
 *
 * An ON-TIME completion also moves the CLASS streak: consecutive calendar days
 * on which at least one student finished. That streak used to live in one
 * browser's localStorage, so it died with a cleared cache and was invisible to
 * the teacher. The arithmetic is shared with the device copy via
 * `classStreakMath` so the two can never drift (pitfalls Class 3).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import {
  foldClassStreak,
  normalizeDay,
  MAX_COMPLETION_DAYS,
} from '@/lib/education/classStreakMath';
import { normalizeMissGapClassKey } from '@/lib/education/missGapClassKey';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

const MAX_TEXT = 120;
const MAX_NAME = 40;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

function text(value: unknown, max = MAX_TEXT): string {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function int(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export async function POST(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'education-miss-gap-complete', {
    windowMs: 60_000,
    maxRequests: 20,
  });
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) || {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Same spelling the progress route reads back with — see missGapClassKey.
  const classKey = normalizeMissGapClassKey(body.classKey);
  if (!classKey) {
    return NextResponse.json({ error: 'classKey required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    // Never a silent no-op (pitfalls Class 4): the client must be able to say
    // "we could not save that" rather than show a fake completion.
    logger.error('[miss-gap] complete: no admin client');
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }

  const user = await getAuthedUser(request);
  const dueDate = normalizeDay(body.dueDate as string);
  const completedOn =
    normalizeDay(body.completedOn as string) || new Date().toISOString().slice(0, 10);
  const onTime = !dueDate || completedOn <= dueDate;
  const studentKey = user?.id
    ? `u:${user.id}`
    : `g:${text(body.studentKey, 64).toLowerCase() || 'anon'}`;

  const wordsTotal = int(body.wordsTotal, 0, 100);
  const wordsCorrect = int(body.wordsCorrect, 0, wordsTotal || 100);
  const nowIso = new Date().toISOString();
  const row = {
    class_key: classKey,
    due_key: dueDate,
    due_date: dueDate || null,
    lesson: text(body.lesson) || null,
    teacher: text(body.teacher, MAX_NAME) || null,
    student_key: studentKey,
    student_name: text(body.studentName, MAX_NAME),
    player_id: user?.id ?? null,
    is_guest: !user?.id,
    words_total: wordsTotal,
    words_correct: wordsCorrect,
    accuracy: int(body.accuracy, 0, 100),
    stars: int(body.stars, 0, 3),
    best_streak: int(body.bestStreak, 0, 100),
    duration_ms: int(body.durationMs, 0, 30 * 60_000),
    on_time: onTime,
    completed_on: completedOn,
    completed_at: nowIso,
    updated_at: nowIso,
  };

  const { data: run, error: runError } = await supabase
    .from('miss_gap_homework_runs')
    .upsert(row, { onConflict: 'class_key,due_key,student_key' })
    .select()
    .single();

  if (runError) {
    logger.error('[miss-gap] complete: run upsert failed', runError);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('miss_gap_class_streaks')
    .select('*')
    .eq('class_key', classKey)
    .maybeSingle();

  const stored = (existing || null) as {
    completion_days?: string[];
    total_completions?: number;
    current_streak?: number;
    longest_streak?: number;
    last_completion_date?: string | null;
  } | null;

  let streak = {
    currentStreak: stored?.current_streak ?? 0,
    longestStreak: stored?.longest_streak ?? 0,
    lastCompletionDate: stored?.last_completion_date ?? null,
    totalCompletions: stored?.total_completions ?? 0,
  };
  let contributed = false;

  if (onTime) {
    const previousDays = Array.isArray(stored?.completion_days)
      ? (stored.completion_days as string[])
      : [];
    const folded = foldClassStreak(previousDays, completedOn, MAX_COMPLETION_DAYS);
    contributed = !previousDays.includes(completedOn);
    const totalCompletions = (stored?.total_completions ?? 0) + 1;
    const longestStreak = Math.max(folded.longestStreak, stored?.longest_streak ?? 0);

    const { error: streakError } = await supabase
      .from('miss_gap_class_streaks')
      .upsert(
        {
          class_key: classKey,
          lesson: row.lesson,
          teacher: row.teacher,
          current_streak: folded.currentStreak,
          longest_streak: longestStreak,
          last_completion_date: folded.lastCompletionDate,
          completion_days: folded.completionDays,
          total_completions: totalCompletions,
          updated_at: nowIso,
        },
        { onConflict: 'class_key' },
      )
      .select()
      .single();

    if (streakError) {
      logger.error('[miss-gap] complete: streak upsert failed', streakError);
    } else {
      streak = {
        currentStreak: folded.currentStreak,
        longestStreak,
        lastCompletionDate: folded.lastCompletionDate,
        totalCompletions,
      };
    }
  }

  return NextResponse.json({ ok: true, run, streak, contributed, onTime });
}
