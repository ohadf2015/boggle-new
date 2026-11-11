import type { ClassroomSummary } from '@/shared/types/classroom';
import { mostMissedWords, type MissedWord } from '@/components/education/live/eduReteachModel';
import { FREE_PREVIEW_WORDS } from '@/lib/education/wordMasteryReport';

/** The free round insight: the few words fewest students found, never a word the board did not carry. */
export function roundHardestWords(summary: ClassroomSummary): MissedWord[] {
  return mostMissedWords(summary).filter((w) => !w.notOnBoard).slice(0, FREE_PREVIEW_WORDS);
}
