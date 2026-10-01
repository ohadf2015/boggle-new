import type { Language, VocabularyLesson, VocabularyWord } from '@/lib/supabase/education/types';
import type { GradeBand, LibraryTopic } from './library';

/** Columns added by 20261001153007_vocabulary_lesson_library_ugc; absent on an older DB. */
export interface LibraryLessonFields {
  source_lesson_id: string | null;
  remixed_from_title: string | null;
  remixed_from_author: string | null;
  author_name: string | null;
  grade_band: GradeBand | null;
  topic: LibraryTopic | null;
  published_at: string | null;
}

export type LibraryLesson = VocabularyLesson & Partial<LibraryLessonFields>;

export type LibrarySource = 'teacher' | 'verified';

export interface LibraryItem {
  /** `curriculum:<id>` / `pack:<id>` for verified content, the lesson id for teacher lists. */
  id: string;
  source: LibrarySource;
  name: string;
  description: string | null;
  language: Language;
  words: VocabularyWord[];
  wordCount: number;
  authorName: string | null;
  gradeBand: GradeBand | null;
  topic: LibraryTopic | null;
  /** null = counts unavailable (hide), 0 = new. */
  copyCount: number | null;
  playCount: number | null;
  createdAt: string | null;
  isMine: boolean;
  remixedFrom: { title: string; author: string | null } | null;
}

export const LIBRARY_EXTRA_COLUMNS = [
  'source_lesson_id',
  'remixed_from_title',
  'remixed_from_author',
  'author_name',
  'grade_band',
  'topic',
  'published_at',
] as const;

/** PostgREST / Postgres "that column is not there" — the migration has not run. */
export function isMissingColumnError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST200' || error.code === '42P01') return true;
  return /column .* does not exist|could not find the .* column|could not find a relationship|relation .* does not exist/i.test(
    error.message ?? '',
  );
}
