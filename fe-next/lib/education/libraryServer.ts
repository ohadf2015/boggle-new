// Server-only so `bad-words` stays out of client bundles.
import { isProfane } from '@/backend/utils/profanityFilter';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import {
  gradeLevelToBand,
  isGradeBand,
  isLibraryTopic,
  listModerationIssues,
  type ModerationIssue,
  type WordEntry,
} from './library';
import type { LibraryItem } from './libraryTypes';
import { isVocabularyLevel } from './differentiation';

function profane(text: string | null | undefined): boolean {
  if (!text) return false;
  return isProfane(text.replace(/[,.;:!?()"]/g, ' '));
}

export function moderateForPublish(list: { name: string; description: string | null; words: WordEntry[] }): ModerationIssue[] {
  const issues = new Set(listModerationIssues(list));
  if (issues.has('empty')) return ['empty'];
  if (profane(list.name)) issues.add('name');
  if (profane(list.description)) issues.add('description');
  if (list.words.some((w) => profane(w.word) || profane(w.definition))) issues.add('words');
  const order: ModerationIssue[] = ['name', 'description', 'words'];
  return order.filter((k) => issues.has(k));
}

type Stats = { copy_count?: number; play_count?: number };

export interface PublicLessonRow {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  language: string;
  words: VocabularyWord[] | null;
  author_name?: string | null;
  grade_band?: string | null;
  topic?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  remixed_from_title?: string | null;
  remixed_from_author?: string | null;
  vocabulary_lesson_stats?: Stats | Stats[] | null;
}

function readStats(raw: PublicLessonRow['vocabulary_lesson_stats']): { copy: number | null; play: number | null } {
  if (raw === undefined) return { copy: null, play: null };
  const s = Array.isArray(raw) ? raw[0] : raw;
  return { copy: s?.copy_count ?? 0, play: s?.play_count ?? 0 };
}

export function publicRowsToItems(rows: PublicLessonRow[], flagged: Set<string>, userId: string | null): LibraryItem[] {
  const items: LibraryItem[] = [];
  for (const r of rows) {
    const words = Array.isArray(r.words) ? r.words.filter((w) => w && typeof w.word === 'string') : [];
    if (flagged.has(r.id) || words.length === 0) continue;
    if (moderateForPublish({ name: r.name, description: r.description, words }).length > 0) continue;
    const stats = readStats(r.vocabulary_lesson_stats);
    items.push({
      id: r.id,
      source: 'teacher',
      name: r.name,
      description: r.description,
      language: r.language as Language,
      words,
      wordCount: words.length,
      authorName: r.author_name?.trim() || null,
      gradeBand: isGradeBand(r.grade_band) ? r.grade_band : null,
      topic: isLibraryTopic(r.topic) ? r.topic : null,
      copyCount: stats.copy,
      playCount: stats.play,
      createdAt: r.published_at ?? r.created_at ?? null,
      isMine: userId !== null && r.teacher_id === userId,
      remixedFrom: r.remixed_from_title ? { title: r.remixed_from_title, author: r.remixed_from_author ?? null } : null,
    });
  }
  return items;
}

export interface CurriculumRow {
  id: string;
  name: string;
  description: string | null;
  language: string;
  grade_level: string | null;
  subject: string | null;
  words: VocabularyWord[] | WordEntry[] | null;
  word_count?: number | null;
}

const nonEmpty = (list: unknown): string[] | null => {
  const items = Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : [];
  return items.length > 0 ? items : null;
};

function curriculumWord(w: VocabularyWord | WordEntry): VocabularyWord {
  const src = w as Partial<VocabularyWord>;
  const synonyms = nonEmpty(src.synonyms);
  const antonyms = nonEmpty(src.antonyms);
  const meanings = nonEmpty(src.meanings);
  return {
    word: w.word,
    canIntegrate: true,
    ...(src.definition ? { definition: src.definition } : {}),
    ...(src.example ? { example: src.example } : {}),
    ...(isVocabularyLevel(src.level) ? { level: src.level } : {}),
    ...(synonyms ? { synonyms } : {}),
    ...(antonyms ? { antonyms } : {}),
    ...(meanings ? { meanings } : {}),
    ...(src.morphology && typeof src.morphology === 'object' ? { morphology: src.morphology } : {}),
  };
}

export function curriculumRowsToItems(rows: CurriculumRow[]): LibraryItem[] {
  return rows.map((r) => {
    const words = (Array.isArray(r.words) ? r.words : []).map(curriculumWord);
    return {
      id: `curriculum:${r.id}`,
      source: 'verified',
      name: r.name,
      description: r.description,
      language: r.language as Language,
      words,
      wordCount: r.word_count ?? words.length,
      authorName: null,
      gradeBand: gradeLevelToBand(r.grade_level),
      topic: isLibraryTopic(r.subject) ? r.subject : null,
      copyCount: null,
      playCount: null,
      createdAt: null,
      isMine: false,
      remixedFrom: null,
    };
  });
}
