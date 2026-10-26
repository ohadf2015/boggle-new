/** Lesson vocabulary loading and the `student_lesson_progress` upsert for classroom rounds. */
import { getSupabase } from '../modules/supabase/client.js';
import type { ClassroomGame } from '../modules/classroomGameManager.js';
import { matchKey } from '../modules/classroomSummary.js';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/shared/types/game';
import logger from '../utils/logger.js';
import { DbWriteError } from './classroomXpAward';

interface WordAttempt {
  attempts: number;
  correct: number;
  lastAttemptAt: string;
}

/** One lesson's vocabulary, keyed for matching. `display` keeps the teacher's form. */
export interface LessonVocabulary {
  language: Language;
  /** matchKey → display word */
  words: Map<string, string>;
}

const HEBREW_RE = /[\u0590-\u05FF]/;

/**
 * Hebrew words are normalized as Hebrew no matter what the lesson claims to
 * be — mirrors `normalizeForStorage` on the client so keys written here and
 * keys written by solo practice land on the same `words_attempted` entry.
 */
function effectiveLanguage(word: string, language: Language): Language {
  return HEBREW_RE.test(word) ? 'he' : language;
}

export function keyOf(word: string, language: Language): string {
  return matchKey(word, effectiveLanguage(word, language));
}

/** Storage key for `words_attempted` — lowercase / finals collapsed, like `normalizeForStorage`. */
function storageKey(word: string, language: Language): string {
  return normalizeWord(word.trim(), effectiveLanguage(word, language));
}

function buildVocabulary(rawWords: unknown, language: Language): LessonVocabulary {
  const words = new Map<string, string>();
  const list = Array.isArray(rawWords) ? rawWords : [];
  for (const entry of list) {
    const raw = typeof entry === 'string' ? entry : (entry as { word?: unknown })?.word;
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    const key = keyOf(raw, language);
    if (!words.has(key)) words.set(key, raw.trim());
  }
  return { language, words };
}

/**
 * Load each lesson's own vocabulary in ONE query. Falls back to the game's
 * union vocabulary (attributed to every lesson) when the lookup fails, and
 * says so loudly — a silent empty map here would make every game look like
 * "no lesson words attempted".
 */
export async function loadLessonVocabulary(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  game: ClassroomGame
): Promise<Map<string, LessonVocabulary>> {
  const byLesson = new Map<string, LessonVocabulary>();
  const lessonIds = game.lessonIds ?? [];
  const unionLanguage: Language = (game.vocabularyWords ?? []).some((w) => HEBREW_RE.test(w)) ? 'he' : 'en';

  try {
    const { data, error } = await supabase
      .from('vocabulary_lessons')
      .select('id, words, language')
      .in('id', lessonIds);

    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as Array<{ id: string; words: unknown; language?: string }>) {
      byLesson.set(row.id, buildVocabulary(row.words, (row.language as Language) || unionLanguage));
    }
    for (const lessonId of lessonIds) {
      if (!byLesson.has(lessonId)) {
        logger.warn(
          'CLASSROOM_GAME',
          `Lesson ${lessonId} not found for game ${game.gameCode} — progress for it will be skipped`
        );
      }
    }
  } catch (err) {
    logger.error(
      'CLASSROOM_GAME',
      `Failed to load lesson vocabulary for game ${game.gameCode} (${(err as Error).message}); ` +
        `falling back to the game's ${game.vocabularyWords?.length ?? 0} union words for all lessons`
    );
    byLesson.clear();
    for (const lessonId of lessonIds) {
      byLesson.set(lessonId, buildVocabulary(game.vocabularyWords ?? [], unionLanguage));
    }
  }
  return byLesson;
}

/**
 * Narrow a lesson's vocabulary to the words this game actually asked.
 *
 * An empty or absent set means "we do not know what was asked" — the board
 * case — and returns the vocabulary untouched. Recording zero attempts for a
 * round that really happened would erase it from the teacher's report, which
 * is worse than the over-reporting this exists to fix.
 */
export function restrictToAsked(vocab: LessonVocabulary, askedKeys: Set<string> | null): LessonVocabulary {
  if (!askedKeys || askedKeys.size === 0) return vocab;
  const words = new Map<string, string>();
  for (const [key, display] of vocab.words) {
    if (askedKeys.has(key)) words.set(key, display);
  }
  // An asked set that matches nothing in this lesson (a stale or foreign list)
  // is treated as unknown rather than as "the whole class attempted nothing".
  if (words.size === 0) return vocab;
  return { language: vocab.language, words };
}

/** Split a lesson's words into found / missed (display form) for one player. */
export function splitLessonWords(vocab: LessonVocabulary, foundKeys: Set<string>) {
  const found: string[] = [];
  const missed: string[] = [];
  for (const [key, display] of vocab.words) {
    (foundKeys.has(key) ? found : missed).push(display);
  }
  return { found, missed };
}

/**
 * Read-modify-write of `student_lesson_progress` for one student × lesson.
 * Every lesson word counts as attempted; found words also count as correct
 * and join `words_mastered` (deduped by normalized key).
 */
export async function upsertLessonProgress(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  studentId: string,
  lessonId: string,
  vocab: LessonVocabulary,
  foundKeys: Set<string>,
  now: string
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('student_lesson_progress')
    .select('words_attempted, words_mastered, started_at')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (readError) throw new DbWriteError(`read progress: ${readError.message}`, readError.code);

  const wordsAttempted: Record<string, WordAttempt> = {
    ...((existing?.words_attempted as Record<string, WordAttempt> | null) ?? {}),
  };
  const wordsMastered: string[] = [...((existing?.words_mastered as string[] | null) ?? [])];
  const masteredKeys = new Set(wordsMastered.map((w) => keyOf(w, vocab.language)));

  for (const [key, display] of vocab.words) {
    const found = foundKeys.has(key);
    const sKey = storageKey(display, vocab.language);
    const prev = wordsAttempted[sKey];
    wordsAttempted[sKey] = {
      attempts: (prev?.attempts ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (found ? 1 : 0),
      lastAttemptAt: now,
    };
    if (found && !masteredKeys.has(key)) {
      masteredKeys.add(key);
      wordsMastered.push(display);
    }
  }

  const { error: upsertError } = await supabase
    .from('student_lesson_progress')
    .upsert(
      {
        student_id: studentId,
        lesson_id: lessonId,
        words_attempted: wordsAttempted,
        words_mastered: wordsMastered,
        started_at: existing?.started_at ?? now,
      },
      { onConflict: 'student_id,lesson_id' }
    );

  if (upsertError) throw new DbWriteError(`upsert progress: ${upsertError.message}`, upsertError.code);
}
