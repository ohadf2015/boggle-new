import type { ClassroomSummary } from '@/shared/types/classroom';
import { mostMissedWords, reteachVerdict, type MissedWord } from '@/components/education/live/eduReteachModel';

/**
 * The words a results screen offers to practice. When every word was found by under half the class
 * the replay verdict stands down, yet the words nobody found are still a real, shorter list.
 */
export function reteachPanelWords(summary: ClassroomSummary): MissedWord[] {
  const verdict = reteachVerdict(summary);
  if (verdict.kind === 'replay') return verdict.words;
  if (verdict.kind !== 'wholeLesson') return [];
  const nobody = mostMissedWords(summary).filter((w) => w.found === 0);
  return nobody.length > 0 && nobody.length < summary.totalWords ? nobody : [];
}
