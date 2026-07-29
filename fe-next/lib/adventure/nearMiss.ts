/**
 * Near-miss feedback utility
 *
 * Computes encouraging messages when a player barely fails a level.
 * Pure function — no side effects, easy to test.
 */
import type { LevelObjective, ObjectiveType } from '@/types/adventure';

export interface NearMissMessage {
  type: ObjectiveType;
  translationKey: string;
  params: { remaining: number };
}

/** Score objectives: show near-miss if player reached >= 80% of target */
const SCORE_THRESHOLD_PCT = 0.8;

/** Count-based objectives: show near-miss if within this many */
const COUNT_THRESHOLD = 2;

/** Objective types that use score-style (percentage) threshold */
const SCORE_TYPES: ReadonlySet<ObjectiveType> = new Set(['scoreTarget']);

/** Objective types that use count-style threshold with "words" phrasing */
const WORD_COUNT_TYPES: ReadonlySet<ObjectiveType> = new Set(['wordCount', 'longWords']);

/**
 * Given level objectives with current progress, return near-miss messages
 * for objectives that were close to completion.
 */
export function getNearMissMessages(objectives: LevelObjective[]): NearMissMessage[] {
  const messages: NearMissMessage[] = [];

  for (const obj of objectives) {
    if (obj.isComplete) continue;
    if (obj.target <= 0) continue;

    const current = obj.current ?? 0;
    const remaining = obj.target - current;
    if (remaining <= 0) continue;

    if (SCORE_TYPES.has(obj.type)) {
      // Percentage-based threshold
      if (current / obj.target >= SCORE_THRESHOLD_PCT) {
        messages.push({
          type: obj.type,
          translationKey: 'adventure.nearMiss.scoreAway',
          params: { remaining },
        });
      }
    } else if (WORD_COUNT_TYPES.has(obj.type)) {
      if (remaining <= COUNT_THRESHOLD) {
        messages.push({
          type: obj.type,
          translationKey: 'adventure.nearMiss.wordsAway',
          params: { remaining },
        });
      }
    } else {
      // Generic count-based (clearIce, timeBonus, etc.)
      if (remaining <= COUNT_THRESHOLD) {
        messages.push({
          type: obj.type,
          translationKey: 'adventure.nearMiss.countAway',
          params: { remaining },
        });
      }
    }
  }

  return messages;
}
