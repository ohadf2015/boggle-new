import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { validateLessonAt } from '@/lib/education/lessonPlan';
import logger from '@/utils/logger';

const LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

const postSchema = z.object({
  classroomId: z.string().uuid(),
  lessonAt: z.string().min(1).max(40),
  timezone: z.string().max(64).optional().nullable(),
  locale: z.string().max(10).optional().nullable(),
});

const classroomSchema = z.object({ classroomId: z.string().uuid() });

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

type Db = Awaited<ReturnType<typeof createClient>>;

async function ownershipError(supabase: Db, classroomId: string, userId: string): Promise<NextResponse | null> {
  const { data: classroom, error } = await supabase
    .from('classrooms')
    .select('id, teacher_id')
    .eq('id', classroomId)
    .maybeSingle();
  if (error) {
    logger.error('[lesson-plan] classroom lookup failed', error);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!classroom) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((classroom as { teacher_id: string | null }).teacher_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = classroomSchema.safeParse({ classroomId: new URL(request.url).searchParams.get('classroomId') });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_query' }, { status: 400 });

  const supabase = await createClient();
  const denied = await ownershipError(supabase, parsed.data.classroomId, user.id);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('teacher_lesson_plans')
    .select('lesson_at')
    .eq('classroom_id', parsed.data.classroomId)
    .is('reminded_at', null)
    .gt('lesson_at', new Date().toISOString())
    .maybeSingle();
  if (error) {
    logger.error('[lesson-plan] read failed', error);
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
  const lessonAt = (data as { lesson_at?: string } | null)?.lesson_at;
  return NextResponse.json({ ok: true, lessonAt: lessonAt ? new Date(lessonAt).toISOString() : null });
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = postSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const { classroomId, timezone, locale } = parsed.data;

  const lessonAt = new Date(parsed.data.lessonAt);
  const check = validateLessonAt(lessonAt, new Date());
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  const supabase = await createClient();
  const denied = await ownershipError(supabase, classroomId, user.id);
  if (denied) return denied;

  const iso = lessonAt.toISOString();
  const { error } = await supabase.from('teacher_lesson_plans').upsert(
    {
      teacher_id: user.id,
      classroom_id: classroomId,
      lesson_at: iso,
      timezone: timezone || null,
      locale: locale && LOCALES.has(locale) ? locale : null,
      reminded_at: null,
    },
    { onConflict: 'classroom_id' },
  );
  if (error) {
    logger.error('[lesson-plan] save failed', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, lessonAt: iso });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = classroomSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('teacher_lesson_plans')
    .delete()
    .eq('classroom_id', parsed.data.classroomId)
    .eq('teacher_id', user.id);
  if (error) {
    logger.error('[lesson-plan] delete failed', error);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
