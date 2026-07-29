/**
 * Word Tower — landmark crossing detector (pure).
 *
 * Cosy ambient beat: when the climber rises past a world landmark (cloud base,
 * jet stream, aurora…) we surface a brief, calm "you just passed X" toast. The
 * landmarks already scroll past on the rail; this names the moment so altitude
 * feels earned. Mirrors {@link milestoneCrossed} so the caller can apply the
 * same zone/milestone collision-guard and avoid toast spam.
 */
import { WORD_TOWER_LANDMARKS, type Landmark } from './landmarks';

/**
 * The highest landmark crossed climbing from `prevM` to `nextM`, or null.
 * Only fires upward (m > prevM && m <= nextM); descending pans never trigger.
 */
export function landmarkCrossed(prevM: number, nextM: number): Landmark | null {
  if (nextM <= prevM) return null;
  let hit: Landmark | null = null;
  for (const l of WORD_TOWER_LANDMARKS) {
    if (l.m > prevM && l.m <= nextM && (!hit || l.m > hit.m)) hit = l;
  }
  return hit;
}
