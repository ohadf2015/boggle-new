/**
 * Classroom Summary
 *
 * Turns a finished classroom game into the pedagogical view of its results:
 * which of the teacher's lesson words the class actually found, who found each
 * one, and what the whole room missed.
 *
 * This is built SERVER-side and ships inside the shared `validatedScores`
 * payload on purpose. The teacher's lesson lives in their own sessionStorage,
 * so anything derived from it on the client is blank for every student in the
 * room — the exact asymmetric-path failure that made classroom results
 * teacher-only. One payload, restored atomically, reaches host and students
 * alike (and reconnecting clients via `cachedResultsPayload`).
 */

// The payload shape lives in shared/ so the client renders exactly what the
// server builds.
export type {
  ClassroomWordCoverage,
  ClassroomPlayerMastery,
  ClassroomSummary,
} from '@/shared/types/classroom';

import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/shared/types/game';
import type {
  ClassroomSummary,
  ClassroomWordCoverage,
  ClassroomPlayerMastery,
} from '@/shared/types/classroom';

interface SummaryWordDetail {
  word: string;
  validated: boolean;
  isDuplicate?: boolean;
}

/**
 * Lesson words arrive in natural form; words a player traced off the board
 * arrive normalized (Hebrew finals collapsed to their base letters, etc.). A
 * plain uppercase compare therefore reports "nobody found it" for any Hebrew
 * lesson word ending in ם/ן/ך/ף/ץ even when the whole class found it — the same
 * asymmetric-compare class of bug as the handoff gate. Normalize BOTH sides.
 */
export function matchKey(word: string, language: Language): string {
  return normalizeWord(word.trim(), language).toUpperCase();
}

export interface BuildClassroomSummaryArgs {
  /** Language the room played in — decides how words are normalized for matching. */
  language?: Language;
  teacherName: string;
  lessonNames: string[];
  lessonIds: string[];
  vocabularyWords: string[];
  /**
   * Human players only. Bots are in the results payload, and letting one count
   * would drop a word off the reteach list that no student actually found.
   */
  players: Array<{ username: string; wordDetails: SummaryWordDetail[]; isBot?: boolean }>;
}

export function buildClassroomSummary(
  args: BuildClassroomSummaryArgs
): ClassroomSummary | null {
  // Keep the teacher's original casing for display, but dedupe case-insensitively
  // — the same word can arrive from two selected lessons.
  const language = args.language ?? 'en';
  const canonical = new Map<string, string>();
  for (const raw of args.vocabularyWords) {
    const key = matchKey(raw, language);
    if (!canonical.has(key)) canonical.set(key, raw);
  }
  if (canonical.size === 0) return null;

  const foundByWord = new Map<string, string[]>();
  for (const key of canonical.keys()) foundByWord.set(key, []);

  const masteryByPlayer: Record<string, ClassroomPlayerMastery> = {};

  for (const player of args.players) {
    if (player.isBot) continue;
    // A duplicate scores zero but the student DID find the word — it counts for
    // mastery. Only the validator's rejection means "not found".
    const hits = new Set<string>();
    for (const detail of player.wordDetails) {
      if (!detail.validated) continue;
      const key = matchKey(detail.word, language);
      if (canonical.has(key)) hits.add(key);
    }
    for (const key of hits) foundByWord.get(key)!.push(player.username);
    masteryByPlayer[player.username] = { found: hits.size, total: canonical.size };
  }

  const coverage: ClassroomWordCoverage[] = [...canonical.entries()].map(
    ([key, word]) => ({ word, foundBy: foundByWord.get(key)! })
  );

  const missedWords = coverage.filter((c) => c.foundBy.length === 0).map((c) => c.word);

  return {
    teacherName: args.teacherName,
    lessonNames: args.lessonNames,
    lessonIds: args.lessonIds,
    totalWords: canonical.size,
    coverage,
    missedWords,
    classFoundCount: canonical.size - missedWords.length,
    masteryByPlayer,
  };
}
