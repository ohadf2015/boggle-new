import type { AsyncFreqLookup } from './frequencyApi';

export type FreqLookup = (bigram: string) => number;

export interface ValidationConfig {
  minFreq: number;
  locale: 'he' | 'en';
}

export interface Triple {
  word1: string;
  bridge: string;
  word2: string;
}

export type ValidationReason =
  | 'degenerate'
  | 'leftPairBelowThreshold'
  | 'rightPairBelowThreshold';

export interface ValidationResult {
  valid: boolean;
  leftFreq: number;
  rightFreq: number;
  reason?: ValidationReason;
}

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ');

// NOTE: bigram frequency is not a naturalness check. Hebrew speakers reject
// reversed-smichut compounds ("חשמל מתח" instead of "מתח חשמלי") and English
// calques ("כוכב סרט" for "movie star") even though both bigrams have wiki
// hits. See `docs/audits/connections-feedback-2026-05-08.md` — generated HE
// triples should get a native-review pass before merging into source.
export function validateTriple(
  triple: Triple,
  freq: FreqLookup,
  cfg: ValidationConfig,
): ValidationResult {
  const w1 = norm(triple.word1);
  const br = norm(triple.bridge);
  const w2 = norm(triple.word2);

  if (w1 === br || br === w2 || w1 === w2) {
    return { valid: false, leftFreq: 0, rightFreq: 0, reason: 'degenerate' };
  }

  const leftFreq = freq(`${w1} ${br}`);
  const rightFreq = freq(`${br} ${w2}`);

  if (leftFreq < cfg.minFreq) {
    return { valid: false, leftFreq, rightFreq, reason: 'leftPairBelowThreshold' };
  }
  if (rightFreq < cfg.minFreq) {
    return { valid: false, leftFreq, rightFreq, reason: 'rightPairBelowThreshold' };
  }
  return { valid: true, leftFreq, rightFreq };
}

export async function validateTripleAsync(
  triple: Triple,
  freq: AsyncFreqLookup,
  cfg: ValidationConfig,
): Promise<ValidationResult> {
  const w1 = norm(triple.word1);
  const br = norm(triple.bridge);
  const w2 = norm(triple.word2);

  if (w1 === br || br === w2 || w1 === w2) {
    return { valid: false, leftFreq: 0, rightFreq: 0, reason: 'degenerate' };
  }

  const leftFreq = await freq(`${w1} ${br}`);
  if (leftFreq < cfg.minFreq) {
    return { valid: false, leftFreq, rightFreq: 0, reason: 'leftPairBelowThreshold' };
  }
  const rightFreq = await freq(`${br} ${w2}`);
  if (rightFreq < cfg.minFreq) {
    return { valid: false, leftFreq, rightFreq, reason: 'rightPairBelowThreshold' };
  }
  return { valid: true, leftFreq, rightFreq };
}
