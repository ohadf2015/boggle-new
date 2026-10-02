import { NextResponse } from 'next/server';
import { createRequestClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import { curriculumRowsToItems, publicRowsToItems, type CurriculumRow, type PublicLessonRow } from '@/lib/education/libraryServer';
import { isMissingColumnError } from '@/lib/education/libraryTypes';

export const dynamic = 'force-dynamic';

const BASE_COLUMNS = 'id, teacher_id, name, description, language, words, created_at';
const FULL_COLUMNS = `${BASE_COLUMNS}, author_name, grade_band, topic, published_at, remixed_from_title, remixed_from_author, vocabulary_lesson_stats(copy_count, play_count)`;
const MAX_PUBLIC_LISTS = 300;

// profiles RLS only exposes the viewer's own row, so the flag is read with the service role.
async function loadTestAccountIds(): Promise<string[] | null> {
  const admin = createAdminClient();
  if (!admin) {
    logger.error('library/discover: no service-role client, withholding teacher lists');
    return null;
  }
  const { data, error } = await admin.from('profiles').select('id').eq('is_test_account', true);
  if (error) {
    logger.error('library/discover: test-account lookup failed, withholding teacher lists', error.message);
    return null;
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

/** Discover feed: public teacher lists (filtered for safety and reports) plus verified curriculum lists. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const langParam = url.searchParams.get('language');
  const language = (EDUCATION_LANGUAGES as readonly string[]).includes(langParam ?? '') ? langParam : null;

  try {
    const { supabase, token } = await createRequestClient(request);
    const { data: auth } = await supabase.auth.getUser(token ?? undefined);
    const userId = auth?.user?.id ?? null;

    const testAccountIds = await loadTestAccountIds();
    const publicQuery = (columns: string, excluded: string[]) => {
      let q = supabase.from('vocabulary_lessons').select(columns).eq('is_public', true);
      if (excluded.length > 0) q = q.not('teacher_id', 'in', `(${excluded.join(',')})`);
      if (language) q = q.eq('language', language);
      return q.order('created_at', { ascending: false }).limit(MAX_PUBLIC_LISTS);
    };

    let publicRows: unknown[] = [];
    let countsAvailable = false;
    if (testAccountIds) {
      let publicResult = await publicQuery(FULL_COLUMNS, testAccountIds);
      countsAvailable = !isMissingColumnError(publicResult.error);
      if (!countsAvailable) publicResult = await publicQuery(BASE_COLUMNS, testAccountIds);
      if (publicResult.error) logger.warn('library/discover: public lists failed', publicResult.error.message);
      publicRows = publicResult.data ?? [];
    }

    const flaggedResult = await supabase.rpc('flagged_vocabulary_lesson_ids');
    const flagged = new Set<string>(
      Array.isArray(flaggedResult.data) ? (flaggedResult.data as unknown[]).map((v) => String(typeof v === 'object' && v ? Object.values(v)[0] : v)) : [],
    );

    let curriculumQuery = supabase
      .from('curriculum_word_lists')
      .select('id, name, description, language, grade_level, subject, words, word_count')
      .eq('is_active', true);
    if (language) curriculumQuery = curriculumQuery.eq('language', language);
    const curriculumResult = await curriculumQuery.order('grade_level', { ascending: true }).order('name', { ascending: true });
    if (curriculumResult.error) logger.warn('library/discover: curriculum failed', curriculumResult.error.message);

    const teacherItems = publicRowsToItems(publicRows as unknown as PublicLessonRow[], flagged, userId);
    const verifiedItems = curriculumRowsToItems((curriculumResult.data ?? []) as unknown as CurriculumRow[]);

    return NextResponse.json(
      { items: [...teacherItems, ...verifiedItems], countsAvailable },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    logger.error('library/discover failed', err);
    return NextResponse.json({ items: [], countsAvailable: false, error: 'DISCOVER_FAILED' }, { status: 500 });
  }
}
