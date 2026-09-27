/**
 * Word Workshop — which placed Word Craft words are "lesson words".
 *
 * The board's dictionary is UPPERCASE and Hebrew tiles carry only regular
 * letters (שלום is spelled שלומ), while a teacher types lesson words in any
 * case, with niqqud, sofit and accents. Both sides go through
 * `canonLessonWord` — the same canonicaliser the Word Craft deal and the
 * server-side completion gate use — so a hit here is a hit the server verifies.
 *
 * A placed word counts when it IS a lesson word (exact) or CONTAINS one of 3+
 * letters (TEACHERS ⊃ TEACHER). Stars are the workshop's own cosmetic counter;
 * they never touch the Word Craft scoreboard.
 */

import type { Language } from '@/shared/types/game';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';

export const WORKSHOP_STARS_EXACT = 3;
export const WORKSHOP_STARS_CONTAINS = 1;
/** Shorter lesson words would match inside half the dictionary. */
const MIN_CONTAINED_LENGTH = 3;

export interface LessonWordHit {
  /** The word as placed on the board. */
  placed: string;
  /** The lesson word it credits, canonical. */
  lessonWord: string;
  kind: 'exact' | 'contains';
}

function canonTargets(lessonWords: readonly string[], language: Language): string[] {
  const out: string[] = [];
  for (const raw of lessonWords) {
    const canon = canonLessonWord(raw ?? '', language);
    if (canon.length >= 2 && !out.includes(canon)) out.push(canon);
  }
  // Longest first: TEACHERS should credit TEACHERS before TEACHER.
  return out.sort((a, b) => [...b].length - [...a].length);
}

export function lessonWordHits(
  placedWords: readonly string[],
  lessonWords: readonly string[],
  language: Language,
): LessonWordHit[] {
  const targets = canonTargets(lessonWords, language);
  if (targets.length === 0) return [];
  const hits: LessonWordHit[] = [];
  for (const placed of placedWords) {
    const canon = canonLessonWord(placed ?? '', language);
    if (!canon) continue;
    if (targets.includes(canon)) {
      hits.push({ placed, lessonWord: canon, kind: 'exact' });
      continue;
    }
    const inside = targets.find((t) => [...t].length >= MIN_CONTAINED_LENGTH && canon.includes(t));
    if (inside) hits.push({ placed, lessonWord: inside, kind: 'contains' });
  }
  return hits;
}

export function workshopStarsFor(hits: readonly LessonWordHit[]): number {
  return hits.reduce((sum, h) => sum + (h.kind === 'exact' ? WORKSHOP_STARS_EXACT : WORKSHOP_STARS_CONTAINS), 0);
}

export interface WorkshopSummary {
  /** Canonical lesson words credited, each once — sent as `vocabularyWordsFound`. */
  lessonWordsFound: string[];
  stars: number;
  hits: number;
}

export function summarizeWorkshop(
  history: ReadonlyArray<{ who: 'player' | 'bot'; words: readonly string[] }>,
  lessonWords: readonly string[],
  language: Language,
): WorkshopSummary {
  const found: string[] = [];
  let stars = 0;
  let hits = 0;
  for (const move of history) {
    if (move.who !== 'player') continue;
    const moveHits = lessonWordHits(move.words, lessonWords, language);
    hits += moveHits.length;
    stars += workshopStarsFor(moveHits);
    for (const h of moveHits) if (!found.includes(h.lessonWord)) found.push(h.lessonWord);
  }
  return { lessonWordsFound: found, stars, hits };
}
