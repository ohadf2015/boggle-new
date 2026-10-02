import { supabase } from '@/lib/supabase';
import { fetchWithAuth } from '@/utils/authFetch';
import logger from '@/utils/logger';
import { notifyLessonsChanged } from '@/hooks/useVocabularyLesson';
import type { Language } from '@/lib/supabase/education/types';
import type { ModerationIssue } from './library';
import { bumpLessonStat } from './lessonPlayStat';
import { isMissingColumnError, type LibraryItem, type LibraryLesson } from './libraryTypes';

export const VERIFIED_AUTHOR = 'LexiClash';

export async function fetchDiscover(language: Language | 'all'): Promise<{ items: LibraryItem[]; countsAvailable: boolean }> {
  const qs = language === 'all' ? '' : `?language=${language}`;
  const res = await fetchWithAuth(`/api/education/library/discover${qs}`);
  if (!res.ok) throw new Error(`discover ${res.status}`);
  const body = (await res.json()) as { items?: LibraryItem[]; countsAvailable?: boolean };
  return { items: body.items ?? [], countsAvailable: body.countsAvailable ?? false };
}

export type PublishResult =
  | { ok: true; authorName: string | null }
  | { ok: false; reason: 'moderation'; issues: ModerationIssue[] }
  | { ok: false; reason: 'forbidden' | 'error' };

export async function publishList(lessonId: string, isPublic: boolean): Promise<PublishResult> {
  try {
    const res = await fetchWithAuth('/api/education/library/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, isPublic }),
      requireSession: true,
    });
    const body = (await res.json().catch(() => ({}))) as { issues?: ModerationIssue[]; authorName?: string | null };
    if (res.status === 422) return { ok: false, reason: 'moderation', issues: body.issues ?? [] };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'forbidden' };
    if (!res.ok) return { ok: false, reason: 'error' };
    notifyLessonsChanged();
    return { ok: true, authorName: body.authorName ?? null };
  } catch (err) {
    logger.warn('publishList failed', err);
    return { ok: false, reason: 'error' };
  }
}

export type ReportReason = 'inappropriate' | 'offensive' | 'unplayable' | 'spam';
export const REPORT_REASONS: readonly ReportReason[] = ['inappropriate', 'offensive', 'unplayable', 'spam'];

export async function reportList(lessonId: string, reason: ReportReason, details?: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('report_vocabulary_lesson', {
    p_lesson_id: lessonId,
    p_reason: reason,
    p_details: details?.trim() || null,
  });
  if (error) {
    logger.warn('reportList failed', error.message);
    return false;
  }
  return data === true;
}

async function findExistingCopy(item: LibraryItem, teacherId: string): Promise<LibraryLesson | null> {
  if (!supabase) return null;
  let query = supabase.from('vocabulary_lessons').select('*').eq('teacher_id', teacherId);
  query =
    item.source === 'teacher'
      ? query.eq('source_lesson_id', item.id)
      : query.eq('name', item.name).eq('remixed_from_author', VERIFIED_AUTHOR);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
  if (error) return null;
  return (data?.[0] as LibraryLesson | undefined) ?? null;
}

// `reuse`: Host/Assign return an earlier copy so hosting a list twice does not pile up copies.
export async function copyToMine(
  item: LibraryItem,
  teacherId: string,
  { reuse = false }: { reuse?: boolean } = {},
): Promise<{ lesson: LibraryLesson | null; reused: boolean; error?: string }> {
  if (!supabase) return { lesson: null, reused: false, error: 'Supabase not configured' };
  if (item.isMine && item.source === 'teacher') {
    const { data } = await supabase.from('vocabulary_lessons').select('*').eq('id', item.id).single();
    return { lesson: (data as LibraryLesson) ?? null, reused: true };
  }
  if (reuse) {
    const existing = await findExistingCopy(item, teacherId);
    if (existing) return { lesson: existing, reused: true };
  }

  const base = {
    teacher_id: teacherId,
    classroom_id: null,
    name: item.name,
    description: item.description,
    language: item.language,
    words: item.words,
    is_public: false,
    source_game_code: null,
  };
  const extra = {
    source_lesson_id: item.source === 'teacher' ? item.id : null,
    remixed_from_title: item.name,
    remixed_from_author: item.source === 'teacher' ? item.authorName : VERIFIED_AUTHOR,
    grade_band: item.gradeBand,
    topic: item.topic,
  };

  let { data, error } = await supabase.from('vocabulary_lessons').insert({ ...base, ...extra }).select().single();
  if (isMissingColumnError(error)) {
    ({ data, error } = await supabase.from('vocabulary_lessons').insert(base).select().single());
  }
  if (error || !data) return { lesson: null, reused: false, error: error?.message ?? 'copy failed' };

  if (item.source === 'teacher') {
    void bumpLessonStat(item.id, 'copy');
  }
  notifyLessonsChanged();
  return { lesson: data as LibraryLesson, reused: false };
}
