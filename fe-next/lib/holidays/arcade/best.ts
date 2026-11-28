import type { ArcadeGameId } from './games';

export type BestVerdict = 'new' | 'tie' | 'close' | null;

export interface BestResult {
  best: number;
  previous: number;
  verdict: BestVerdict;
}

const key = (game: ArcadeGameId) => `holiday-arcade-best:${game}`;

export function readBest(game: ArcadeGameId): number {
  try {
    const n = Number(localStorage.getItem(key(game)));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function closeness(score: number, best: number): BestVerdict {
  if (score <= 0) return null;
  if (score > best) return 'new';
  if (score === best) return 'tie';
  return score >= best * 0.9 ? 'close' : null;
}

export function recordBest(game: ArcadeGameId, score: number): BestResult {
  const previous = readBest(game);
  const verdict = closeness(score, previous);
  const best = Math.max(previous, score);
  if (verdict === 'new') {
    try {
      localStorage.setItem(key(game), String(best));
    } catch {
      // private mode or blocked storage: the verdict still shows for this run
    }
  }
  return { best, previous, verdict };
}
