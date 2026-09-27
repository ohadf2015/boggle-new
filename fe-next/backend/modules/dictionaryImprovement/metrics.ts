/**
 * Dictionary quality metrics (pure) + the monotonic-quality gate.
 *
 *  - recall@gold      : fraction of known-valid gold words present in the dict.
 *  - precision@sample : fraction of a re-verified accepted sample that holds up.
 *  - qualityGate      : refuse a batch that would regress precision beyond tol.
 *
 * Cheap to compute so the auto-loop can target them every run.
 */
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { LangCode } from './types';

export interface RecallResult {
  recall: number;
  present: number;
  total: number;
}

/**
 * @param has  membership test against the live dictionary (normalized input).
 * @param goldValid known-valid words for the language.
 */
export function computeRecallAtGold(
  has: (normalizedWord: string) => boolean,
  goldValid: string[],
  lang: LangCode,
): RecallResult {
  const total = goldValid.length;
  if (total === 0) return { recall: 0, present: 0, total: 0 };
  let present = 0;
  for (const g of goldValid) {
    const norm = normalizeWord(String(g).trim(), lang as never);
    if (norm && has(norm)) present += 1;
  }
  return { recall: present / total, present, total };
}

export interface PrecisionResult {
  precision: number;
  held: number;
  total: number;
}

/** @param sample accepted words re-verified; `holds` = still valid under strict re-check. */
export function computePrecisionFromSample(sample: Array<{ word: string; holds: boolean }>): PrecisionResult {
  const total = sample.length;
  if (total === 0) return { precision: 1, held: 0, total: 0 }; // vacuously precise
  const held = sample.filter((s) => s.holds).length;
  return { precision: held / total, held, total };
}

export interface GateResult {
  ok: boolean;
  reason: string;
}

/**
 * Pass iff there is no prior baseline OR `next` stays within `tolerance` of it.
 * Guards the loop against silent drift toward false-accepts.
 */
export function qualityGate(prev: number | null, next: number, tolerance = 0.02): GateResult {
  if (prev === null || prev === undefined) return { ok: true, reason: 'no-baseline' };
  if (next >= prev - tolerance) return { ok: true, reason: 'within-tolerance' };
  return {
    ok: false,
    reason: `precision regression: ${next.toFixed(4)} < ${prev.toFixed(4)} - ${tolerance}`,
  };
}
