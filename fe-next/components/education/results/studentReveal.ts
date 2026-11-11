import type { MascotMood } from '@/components/multiplayer/results/mpResultsView';

export type StudentVerdict = 'won' | 'tied' | 'lost';

export interface StudentVerdictInput {
  rank: number;
  total: number;
  score: number;
  /** My score minus my rival's, when the round had a duel. */
  rivalDiff?: number | null;
  gapKind?: 'ahead' | 'behind' | 'tied' | null;
}

/** Podium places only count as a win in a class big enough that the podium is not everyone. */
const PODIUM_CLASS_MIN = 4;

export function studentVerdict({ rank, total, score, rivalDiff, gapKind }: StudentVerdictInput): StudentVerdict {
  if (typeof rivalDiff === 'number') return rivalDiff > 0 ? 'won' : rivalDiff === 0 ? 'tied' : 'lost';
  if (score <= 0) return 'lost';
  if (rank === 1) return gapKind === 'tied' ? 'tied' : 'won';
  return rank <= 3 && total >= PODIUM_CLASS_MIN ? 'won' : 'lost';
}

export function verdictLook(verdict: StudentVerdict): { surface: string; mascot: MascotMood } {
  if (verdict === 'won') return { surface: 'bg-neo-lime', mascot: 'victory' };
  if (verdict === 'tied') return { surface: 'bg-neo-yellow', mascot: 'cheer' };
  return { surface: 'bg-neo-cyan', mascot: 'think' };
}

export type RevealBeat = 'rank' | 'verdict' | 'chest' | 'done';

const TIMELINE: ReadonlyArray<{ beat: RevealBeat; at: number }> = [
  { beat: 'rank', at: 0 },
  { beat: 'verdict', at: 1000 },
  { beat: 'chest', at: 1800 },
  { beat: 'done', at: 3400 },
];

export const STUDENT_REVEAL_FINAL: RevealBeat = 'done';

export function studentRevealTimeline() {
  return TIMELINE;
}

export function revealBeatAt(elapsed: number): RevealBeat {
  let beat: RevealBeat = TIMELINE[0].beat;
  for (const step of TIMELINE) if (elapsed >= step.at) beat = step.beat;
  return beat;
}

const ORDER: Record<RevealBeat, number> = { rank: 0, verdict: 1, chest: 2, done: 3 };

export function beatReached(current: RevealBeat, target: RevealBeat): boolean {
  return ORDER[current] >= ORDER[target];
}
