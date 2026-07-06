/**
 * Normalize each mode's native round-end payload to QuickRoundResult.
 * Pure functions — the dispatcher component calls the matching one.
 */
import { calculateWordScore } from '@/shared/utils/scoring';
import type { QuickRoundConfig, QuickRoundResult } from '../types';

function base(score: number, wordsFound: number, cfg: QuickRoundConfig, durationMs?: number): QuickRoundResult {
  const scorePct = cfg.perfectScore > 0
    ? Math.min(100, Math.round((score / cfg.perfectScore) * 100))
    : 0;
  return {
    mode: cfg.mode,
    seed: cfg.seed,
    score,
    perfectScore: cfg.perfectScore,
    scorePct,
    wordsFound,
    totalWords: cfg.totalWords,
    durationMs: durationMs ?? cfg.durationSec * 1000,
  };
}

export function fromWordWheel(
  r: { wordsFound: string[]; score: number; timeSeconds: number },
  cfg: QuickRoundConfig
): QuickRoundResult {
  return base(r.score, r.wordsFound.length, cfg, r.timeSeconds * 1000);
}

/**
 * Survival emits no score — quick play scores it as the sum of discovered
 * word scores (same canonical scoring the perfect total uses).
 */
export function fromSurvival(
  r: { wordsDiscovered: Array<{ word: string }> },
  cfg: QuickRoundConfig
): QuickRoundResult {
  const score = r.wordsDiscovered.reduce((sum, d) => sum + calculateWordScore(d.word, 0), 0);
  return base(score, r.wordsDiscovered.length, cfg);
}

export function fromSinglePlayer(
  r: { score: number; wordsFound: string[] },
  cfg: QuickRoundConfig
): QuickRoundResult {
  return base(r.score, r.wordsFound.length, cfg);
}

export function fromBlast(
  r: { score: number; wordsFound: string[] },
  cfg: QuickRoundConfig
): QuickRoundResult {
  return base(r.score, r.wordsFound.length, cfg);
}
