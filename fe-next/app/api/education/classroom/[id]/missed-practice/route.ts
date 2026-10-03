import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getClassMastery } from '@/lib/supabase/wordMastery';
import { buildWordMasteryReport, buildSpacedReviewDates, SPACED_REVIEW_DAYS } from '@/lib/education/wordMasteryReport';
import { pickMissedPracticeWords, enrichReviewWords, isPlausibleLocalDay, missedWordPool } from '@/lib/education/missedPracticePlan';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import logger from '@/utils/logger';

const bodySchema = z.object({
  today: z.string(),
  names: z.array(z.string().trim().min(1).max(120)).length(SPACED_REVIEW_DAYS.length),
  words: z.array(z.string().min(1).max(64)).max(50).optional(),
});

/**
 * POST /api/education/classroom/[id]/missed-practice — Teacher Pro.
 * Assigns the class's missed words as three spaced rounds due +1/+3/+7 days.
 * 401/400/403 ownership, 402 not Pro, 422 nothing missed, 409 already assigned today.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id, 'id, name, language');
  if (!auth.ok) return auth.response;
  const { sb, userId, classroom } = auth;

  const subscription = await checkTeacherSubscription(userId);
  if (!subscription.has_pro) {
    return NextResponse.json({ ok: false, error: 'Teacher Pro required' }, { status: 402 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPlausibleLocalDay(parsed.data.today, Date.now())) {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
  const { today, names, words: requested } = parsed.data;

  const mastery = await getClassMastery(classroom.id, sb as never);
  if (mastery.error || !mastery.data) {
    logger.error('[missed-practice] evidence read failed', mastery.error);
    return NextResponse.json({ ok: false, error: 'Could not read class results' }, { status: 500 });
  }
  const pool = requested?.length ? missedWordPool(mastery.data) : buildWordMasteryReport(mastery.data).hardestWords;
  const words = pickMissedPracticeWords(pool, requested);
  if (words.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_missed_words' }, { status: 422 });
  }

  const { data: existing } = await sb
    .from('vocabulary_lessons')
    .select('id')
    .eq('teacher_id', userId)
    .eq('classroom_id', classroom.id)
    .eq('name', names[0])
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: false, error: 'already_assigned' }, { status: 409 });
  }

  const { data: sourceLessons } = await sb.from('vocabulary_lessons').select('words').eq('teacher_id', userId).limit(100);
  const reviewWords = enrichReviewWords(words, sourceLessons ?? []);
  const dueDates = buildSpacedReviewDates(today);
  const created: string[] = [];

  const rollback = async (reason: unknown) => {
    logger.error('[missed-practice] round failed, rolling back', reason);
    if (created.length > 0) await sb.from('vocabulary_lessons').delete().in('id', created);
    return NextResponse.json({ ok: false, error: 'Could not assign the review rounds' }, { status: 500 });
  };

  for (let i = 0; i < dueDates.length; i += 1) {
    const { data: lesson, error: lessonError } = await sb
      .from('vocabulary_lessons')
      .insert({
        teacher_id: userId,
        classroom_id: classroom.id,
        name: names[i],
        description: null,
        language: classroom.language ?? 'en',
        words: reviewWords,
        is_public: false,
      })
      .select('id')
      .single();
    if (lessonError || !lesson) return rollback(lessonError);
    created.push((lesson as { id: string }).id);

    const { error: assignError } = await sb
      .from('lesson_assignments')
      .insert({ lesson_id: (lesson as { id: string }).id, classroom_id: classroom.id, due_date: dueDates[i] });
    if (assignError) return rollback(assignError);
  }

  return NextResponse.json({
    ok: true,
    words,
    rounds: created.map((lessonId, i) => ({ lessonId, dueDate: dueDates[i] })),
  });
}
