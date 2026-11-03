import { nextTarget, type BlastTarget, type RivalScore } from './rivalTarget';

export interface WaveGoalInput {
  runScoreBefore: number;
  waveScore: number;
  personalBest: number | null;
  rank: number | null;
  total: number | null;
  rivals: readonly RivalScore[];
}

export interface WaveGoal {
  /** Weekly players this wave's score moved the run past, nearest last. */
  justPassed: RivalScore[];
  /** Weekly rank if the run ended now (never worse than the rank before it). */
  rank: number | null;
  total: number | null;
  /** Players on the board the run is ahead of right now. */
  ahead: number | null;
  /** Next score to chase, with how much of the way the run already is. */
  target: BlastTarget | null;
  progress: number;
}

/** The between-wave chase: who this wave beat, where the run stands, and who is next. */
export function buildWaveGoal(input: WaveGoalInput): WaveGoal {
  const { runScoreBefore, waveScore, personalBest, rank, total, rivals } = input;
  const runScore = runScoreBefore + waveScore;
  const passedRun = rivals.filter((r) => r.score <= runScore);
  const justPassed = passedRun
    .filter((r) => r.score > runScoreBefore)
    .sort((a, b) => b.score - a.score);
  const projectedRank = rank != null ? Math.max(1, rank - passedRun.length) : null;
  const ahead = projectedRank != null && total != null ? Math.max(0, total - projectedRank) : null;
  const target = nextTarget(runScore, personalBest, rivals);
  const progress =
    !target || target.kind === 'top' ? 1 : Math.min(1, Math.max(0.04, runScore / (runScore + target.gap)));
  return { justPassed, rank: projectedRank, total, ahead, target, progress };
}
