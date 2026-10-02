import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRequestClient } from '@/utils/supabase/server';
import logger from '@/utils/logger';
import { moderateForPublish } from '@/lib/education/libraryServer';
import { isMissingColumnError } from '@/lib/education/libraryTypes';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  lessonId: z.string().uuid(),
  isPublic: z.boolean(),
});

/** Share to Discover / unshare. Teachers only, own lists only, and a public list must pass moderation. */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { supabase, token } = await createRequestClient(request);
  const { data: auth, error: authError } = await supabase.auth.getUser(token ?? undefined);
  const user = auth?.user;
  if (authError || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_role, is_admin, display_name, username')
    .eq('id', user.id)
    .single();
  const isTeacher = profile?.is_admin === true || profile?.user_role === 'teacher' || profile?.user_role === 'admin';
  if (!isTeacher) return NextResponse.json({ error: 'TEACHER_ROLE_REQUIRED' }, { status: 403 });

  const { data: lesson, error: lessonError } = await supabase
    .from('vocabulary_lessons')
    .select('id, teacher_id, name, description, words')
    .eq('id', body.lessonId)
    .single();
  if (lessonError || !lesson || lesson.teacher_id !== user.id) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (body.isPublic) {
    const issues = moderateForPublish({
      name: lesson.name,
      description: lesson.description,
      words: (lesson.words as VocabularyWord[] | null) ?? [],
    });
    if (issues.length > 0) return NextResponse.json({ error: 'MODERATION', issues }, { status: 422 });
  }

  const authorName = (profile?.display_name || profile?.username || '').trim() || null;
  const full = body.isPublic
    ? { is_public: true, published_at: new Date().toISOString(), author_name: authorName }
    : { is_public: false };

  let { error } = await supabase.from('vocabulary_lessons').update(full).eq('id', lesson.id).eq('teacher_id', user.id);
  if (isMissingColumnError(error)) {
    ({ error } = await supabase.from('vocabulary_lessons').update({ is_public: body.isPublic }).eq('id', lesson.id).eq('teacher_id', user.id));
  }
  if (error) {
    logger.error('library/publish update failed', error.message);
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, isPublic: body.isPublic, authorName });
}
