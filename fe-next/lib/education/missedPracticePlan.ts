import { normalizeForStorage, type VocabularyWord } from '@/lib/supabase/education/types';
import type { HardWord } from '@/lib/education/wordMasteryReport';

/** Ranked missed words, optionally narrowed by the teacher; never widened by the client. */
export function pickMissedPracticeWords(ranked: readonly HardWord[], requested?: readonly string[]): string[] {
  const all = ranked.filter((w) => w.missed > 0).map((w) => w.display);
  if (!requested || requested.length === 0) return all;
  const wanted = new Set(requested.map((w) => normalizeForStorage(w)));
  return all.filter((w) => wanted.has(normalizeForStorage(w)));
}

export interface SourceLessonRow {
  words: unknown;
}

export function enrichReviewWords(words: readonly string[], lessons: readonly SourceLessonRow[]): VocabularyWord[] {
  const known = new Map<string, VocabularyWord>();
  for (const lesson of lessons) {
    if (!Array.isArray(lesson?.words)) continue;
    for (const entry of lesson.words as unknown[]) {
      const w = entry as Partial<VocabularyWord> | null;
      if (!w || typeof w.word !== 'string') continue;
      const key = normalizeForStorage(w.word);
      if (!known.has(key)) known.set(key, w as VocabularyWord);
    }
  }
  return words.map((word) => {
    const src = known.get(normalizeForStorage(word));
    const out: VocabularyWord = { word, canIntegrate: true };
    if (src?.definition) out.definition = src.definition;
    if (src?.synonyms?.length) out.synonyms = src.synonyms;
    if (src?.antonyms?.length) out.antonyms = src.antonyms;
    if (src?.example) out.example = src.example;
    return out;
  });
}

const DAY_MS = 86_400_000;

export function isPlausibleLocalDay(day: string, now: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const at = Date.parse(`${day}T12:00:00Z`);
  if (!Number.isFinite(at)) return false;
  return Math.abs(at - now) <= 1.5 * DAY_MS;
}
