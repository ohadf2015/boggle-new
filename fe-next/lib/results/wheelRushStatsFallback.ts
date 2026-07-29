import type { WheelRushPlayerStats } from '@/shared/types/game';

interface ScoreLikeWord {
  word: string;
  validated?: boolean;
  isDuplicate?: boolean;
}

interface ScoreLike {
  username: string;
  score?: number;
  allWords?: ScoreLikeWord[];
}

// Reconstruct wheel-rush per-player stats from final-scores when the dedicated
// `wheelRushSummary.playerStats` payload was lost (server scoring threw +
// fallback emit, or a late join missed the cache). Keeps the wheel-rush
// hero on results from disappearing silently.
export function deriveWheelRushStatsFromScores(
  scores: ScoreLike[] | null | undefined,
): Record<string, WheelRushPlayerStats> {
  if (!scores || scores.length === 0) return {};
  const out: Record<string, WheelRushPlayerStats> = {};
  for (const p of scores) {
    const valid = (p.allWords ?? []).filter(w => w?.validated && !w?.isDuplicate);
    const bestWord = valid.reduce((best, w) => (w.word.length > best.length ? w.word : best), '');
    out[p.username] = {
      wordsLocked: valid.length,
      wordsStolen: 0,
      wordsStolenFromMe: 0,
      bestWord,
      totalScore: p.score ?? 0,
    };
  }
  return out;
}

export function resolveWheelRushStats(
  fromServer: Record<string, WheelRushPlayerStats> | null | undefined,
  scores: ScoreLike[] | null | undefined,
): Record<string, WheelRushPlayerStats> {
  if (fromServer && Object.keys(fromServer).length > 0) return fromServer;
  return deriveWheelRushStatsFromScores(scores);
}
