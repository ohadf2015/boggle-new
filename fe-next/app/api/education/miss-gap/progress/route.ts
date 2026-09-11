/**
 * GET /api/education/miss-gap/progress?classKey=&dueDate= — who played, how they
 * did, and where the class streak stands.
 *
 * PRIVACY GATE. The class key travels inside the homework share link, so anyone
 * holding that link could ask this route for the roster. They don't get one:
 *
 *   anonymous caller → counts only (players, average accuracy, stars, streak).
 *                      The student's own completion screen needs exactly this
 *                      much to say "you and 11 classmates are keeping it alive".
 *   signed-in caller → the named list, for the teacher's assignment card.
 *
 * Names are first names a student typed themselves; no email, no roster row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { normalizeDay } from '@/lib/education/classStreakMath';
import { normalizeMissGapClassKey } from '@/lib/education/missGapClassKey';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

const MAX_RUNS = 60;

interface RunRow {
  student_name?: string | null;
  student_key?: string | null;
  stars?: number | null;
  accuracy?: number | null;
  words_correct?: number | null;
  words_total?: number | null;
  best_streak?: number | null;
  duration_ms?: number | null;
  on_time?: boolean | null;
  is_guest?: boolean | null;
  completed_at?: string | null;
}

export async function GET(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'education-miss-gap-progress', {
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const url = new URL(request.url);
  const classKey = normalizeMissGapClassKey(url.searchParams.get('classKey'));
  if (!classKey) {
    return NextResponse.json({ error: 'classKey required' }, { status: 400 });
  }
  // A MISSING `dueDate` means "every assignment for this class" — the teacher
  // composing on a URL with no `due=` must not be answered with the rows filed
  // under the empty due key. Only an explicitly supplied date narrows the query.
  const hasDueDate = url.searchParams.has('dueDate');
  const dueKey = normalizeDay(url.searchParams.get('dueDate'));

  const supabase = createAdminClient();
  if (!supabase) {
    logger.error('[miss-gap] progress: no admin client');
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }

  const user = await getAuthedUser(request);

  const [{ data: runData, error: runError }, { data: streakRow }] = await Promise.all([
    (() => {
      const query = supabase
        .from('miss_gap_homework_runs')
        .select(
          'student_name, student_key, stars, accuracy, words_correct, words_total, best_streak, duration_ms, on_time, is_guest, completed_at',
        )
        .eq('class_key', classKey);
      return (hasDueDate ? query.eq('due_key', dueKey) : query)
        .order('completed_at', { ascending: true })
        .limit(MAX_RUNS);
    })(),
    supabase.from('miss_gap_class_streaks').select('*').eq('class_key', classKey).maybeSingle(),
  ]);

  if (runError) {
    logger.error('[miss-gap] progress: run read failed', runError);
    return NextResponse.json({ error: 'Could not read progress' }, { status: 500 });
  }

  const rows = (Array.isArray(runData) ? runData : []) as RunRow[];
  const players = rows.length;
  const averageAccuracy = players
    ? Math.round(rows.reduce((sum, r) => sum + (r.accuracy ?? 0), 0) / players)
    : 0;
  const totalStars = rows.reduce((sum, r) => sum + (r.stars ?? 0), 0);
  const perfect = rows.filter((r) => (r.accuracy ?? 0) >= 100).length;

  const streak = {
    currentStreak: (streakRow as { current_streak?: number } | null)?.current_streak ?? 0,
    longestStreak: (streakRow as { longest_streak?: number } | null)?.longest_streak ?? 0,
    lastCompletionDate:
      (streakRow as { last_completion_date?: string | null } | null)?.last_completion_date ??
      null,
    totalCompletions:
      (streakRow as { total_completions?: number } | null)?.total_completions ?? 0,
  };

  return NextResponse.json({
    ok: true,
    players,
    averageAccuracy,
    totalStars,
    perfect,
    streak,
    // Named roster for a signed-in caller only — see the privacy gate above.
    runs: user
      ? rows.map((r) => ({
          name: (r.student_name || '').trim(),
          stars: r.stars ?? 0,
          accuracy: r.accuracy ?? 0,
          wordsCorrect: r.words_correct ?? 0,
          wordsTotal: r.words_total ?? 0,
          bestStreak: r.best_streak ?? 0,
          durationMs: r.duration_ms ?? 0,
          onTime: r.on_time ?? false,
          isGuest: r.is_guest ?? true,
          completedAt: r.completed_at ?? null,
        }))
      : [],
  });
}
