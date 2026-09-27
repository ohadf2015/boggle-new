/**
 * Live Vocab Quiz — lesson word loader.
 *
 * The quiz needs the RICH per-word data (definition, synonyms, antonyms,
 * example sentence), which `ClassroomGame.vocabularyWords` does not carry —
 * that field is a flat `string[]` sized for embedding words into a letter grid.
 * The rich rows live in `vocabulary_lessons.words` as JSONB, so we read them
 * server-side rather than trusting a client payload: a student who can forge
 * the word list can forge the answers.
 *
 * Mirrors the lesson lookup in `handlers/classroomGamePersistence.ts` so the
 * quiz drills the same words the teacher's report is keyed on.
 */

import { getSupabase } from '../modules/supabase/client.js';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import logger from '../utils/logger.js';

/** Coerce one JSONB entry into a VocabularyWord, or null if it is not usable. */
function toVocabularyWord(entry: unknown): VocabularyWord | null {
  if (typeof entry === 'string') {
    const word = entry.trim();
    return word ? { word, canIntegrate: true } : null;
  }
  if (!entry || typeof entry !== 'object') return null;

  const row = entry as Record<string, unknown>;
  const word = typeof row.word === 'string' ? row.word.trim() : '';
  if (!word) return null;

  const list = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const items = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim());
    return items.length > 0 ? items : undefined;
  };
  const text = (value: unknown): string | undefined => {
    const s = typeof value === 'string' ? value.trim() : '';
    return s || undefined;
  };

  return {
    word,
    canIntegrate: row.canIntegrate !== false,
    definition: text(row.definition),
    synonyms: list(row.synonyms),
    antonyms: list(row.antonyms),
    example: text(row.example),
  };
}

/**
 * Load every lesson word for a classroom game, deduped by word.
 *
 * Returns [] on any failure and says so in the log. The caller turns an empty
 * list into a visible "this lesson has no quizzable words yet" message for the
 * teacher — a silent empty round is the Class 4 failure mode this codebase
 * keeps re-learning.
 */
export async function loadLessonVocabularyWords(lessonIds: string[]): Promise<VocabularyWord[]> {
  return (await loadLessonVocabulary(lessonIds)).words;
}

export interface LessonVocabularyResult {
  words: VocabularyWord[];
  /**
   * The lesson's language. Passed on to the question builder because only
   * English currently tops thin distractor pools up from a built-in bank, which
   * can be the difference between a focus being playable and not.
   */
  language?: string;
}

export async function loadLessonVocabulary(lessonIds: string[]): Promise<LessonVocabularyResult> {
  if (!lessonIds || lessonIds.length === 0) return { words: [] };

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('VOCAB_QUIZ', 'Supabase not configured — cannot load lesson words for a quiz');
    return { words: [] };
  }

  try {
    const { data, error } = await supabase
      .from('vocabulary_lessons')
      .select('id, words, language')
      .in('id', lessonIds);

    if (error) throw new Error(error.message);

    const byWord = new Map<string, VocabularyWord>();
    let language: string | undefined;
    for (const row of (data ?? []) as Array<{ id: string; words: unknown; language?: string }>) {
      // Lessons in one classroom game share a language in practice; first wins.
      if (!language && typeof row.language === 'string' && row.language) language = row.language;
      const entries = Array.isArray(row.words) ? row.words : [];
      for (const entry of entries) {
        const parsed = toVocabularyWord(entry);
        if (!parsed) continue;
        const key = parsed.word.toLowerCase();
        // First lesson wins on a duplicate, matching the persistence layer's
        // union behaviour so both sides drill the same display form.
        if (!byWord.has(key)) byWord.set(key, parsed);
      }
    }

    return { words: [...byWord.values()], language };
  } catch (err) {
    logger.error(
      'VOCAB_QUIZ',
      `Failed to load lesson words for ${lessonIds.join(', ')}: ${(err as Error).message}`
    );
    return { words: [] };
  }
}
