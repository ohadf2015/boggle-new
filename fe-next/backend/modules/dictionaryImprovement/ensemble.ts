/**
 * Ensemble verdict (pure) — combine deterministic authorities with LLM judges.
 *
 * Council rule, distilled:
 *  - Offensive is a HARD block.
 *  - A deterministic authority (Wiktionary/Jisho/milog) dominates: verify→promote,
 *    reject→reject. This mirrors the existing auto-promotion path.
 *  - For the AMBIGUOUS tail (deterministic silent/not-found), a confident
 *    dual-judge agreement can promote — but only when frequency is not ruled out,
 *    never on a single LLM vote, and never below the confidence threshold.
 *
 * Voting weights: deterministic 'verified' = 2, each qualifying judge = ±1.
 */
import type { EnsembleResult, EnsembleSignals } from './types';

export interface EnsembleConfig {
  judgeConfThreshold: number;
  deterministicWeight: number;
  judgeWeight: number;
  /** Block LLM-only promotion when the candidate fails the frequency floor. */
  requireFreqForLlmOnly: boolean;
}

export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  judgeConfThreshold: 0.75,
  deterministicWeight: 2,
  judgeWeight: 1,
  requireFreqForLlmOnly: true,
};

export function ensembleVerdict(
  signals: EnsembleSignals,
  config: EnsembleConfig = DEFAULT_ENSEMBLE_CONFIG,
): EnsembleResult {
  const { deterministic = null, judges = [], freqOk, offensive } = signals;
  const { judgeConfThreshold, deterministicWeight, judgeWeight, requireFreqForLlmOnly } = config;

  if (offensive === true) {
    return { decision: 'reject', reason: 'offensive', support: Number.NEGATIVE_INFINITY };
  }
  if (deterministic === 'rejected') {
    return { decision: 'reject', reason: 'deterministic-reject', support: -1 };
  }

  const judgesValid = judges.filter((j) => j.valid && j.confidence >= judgeConfThreshold).length;
  const judgesInvalid = judges.filter((j) => !j.valid).length;
  const support =
    (deterministic === 'verified' ? deterministicWeight : 0) +
    judgesValid * judgeWeight -
    judgesInvalid * judgeWeight;

  // Deterministic authority is sufficient on its own (existing pipeline behaviour).
  if (deterministic === 'verified') {
    return { decision: 'promote', reason: 'deterministic-verified', support };
  }

  // Ambiguous tail — LLM judges decide, conservatively.
  if (requireFreqForLlmOnly && freqOk === false) {
    return { decision: 'review', reason: 'low-frequency-llm-only', support };
  }
  if (judgesValid >= 2 && support >= 2) {
    return { decision: 'promote', reason: 'dual-judge', support };
  }
  if (support < 0) {
    return { decision: 'reject', reason: 'judges-against', support };
  }
  return { decision: 'review', reason: 'insufficient-support', support };
}
