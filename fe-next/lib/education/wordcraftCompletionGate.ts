/**
 * Server-side completion bar for Word Craft homework (PATCH /api/education/practice).
 *
 * Passing once let the easy bot end the round and the homework still counted as
 * done with full XP. The game runs on the client, so the words built are
 * client-reported — but the DECISION is made here: claimed lesson words are
 * re-matched against the lesson's own words (read with the service role), and a
 * round below `wordCraftAttemptIsMeaningful` is recorded as an attempt
 * (`completed_at` stays NULL, no XP, no assignment stamp) — so the student can
 * play again on the same session and finish it for real.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import type { Language } from '@/shared/types/game';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { WORDCRAFT_SESSION_MODE, wordCraftAttemptIsMeaningful } from './wordcraftAssignment';

export interface WordCraftGateResult {
  completed: boolean;
  /** Lesson words verified against the lesson — replaces the client's claim. */
  vocabularyWordsFound?: string[];
  /** Written to `practice_sessions.results` for every Word Craft round (attempted or completed). */
  results?: { outcome: 'attempted' | 'completed'; lessonWords: number; validWords: number };
}

async function readLesson(
  admin: SupabaseClient | null,
  lessonId: string,
): Promise<{ words: string[]; language: Language } | null> {
  if (!admin) {
    logger.error('gateWordCraftCompletion: service-role client unavailable — lesson words unverifiable');
    return null;
  }
  const { data, error } = await admin.from('vocabulary_lessons').select('words, language').eq('id', lessonId).single();
  if (error || !data) {
    logger.error('gateWordCraftCompletion: lesson read failed — lesson words unverifiable', error);
    return null;
  }
  const words = Array.isArray(data.words)
    ? data.words.map((w: unknown) => (typeof w === 'string' ? w : (w as { word?: string })?.word ?? '')).filter(Boolean)
    : [];
  return { words, language: data.language as Language };
}

export async function gateWordCraftCompletion(
  admin: SupabaseClient | null,
  args: {
    requested: boolean | undefined;
    sessionMode: string | null | undefined;
    lessonId: string;
    vocabularyWordsFound?: string[];
    wordsFound?: string[];
  },
): Promise<WordCraftGateResult> {
  if (!args.requested || args.sessionMode !== WORDCRAFT_SESSION_MODE) return { completed: Boolean(args.requested) };

  const validWords = [...new Set((args.wordsFound ?? []).map((w) => w.trim().toUpperCase()).filter((w) => w.length >= 2))];
  const lesson = await readLesson(admin, args.lessonId);
  const verified: string[] = [];
  if (lesson) {
    const targets = new Set(lesson.words.map((w) => canonLessonWord(w, lesson.language)));
    for (const claimed of [...(args.vocabularyWordsFound ?? []), ...validWords]) {
      const canon = canonLessonWord(claimed, lesson.language);
      if (targets.has(canon) && !verified.includes(canon)) verified.push(canon);
    }
  }

  const completed = wordCraftAttemptIsMeaningful({ lessonWordsFound: verified, validWordsFound: validWords });
  // Always written for a Word Craft round, so a completing replay overwrites an earlier 'attempted'.
  const results = { outcome: completed ? 'completed' as const : 'attempted' as const, lessonWords: verified.length, validWords: validWords.length };
  return { completed, vocabularyWordsFound: verified, results };
}
