/**
 * Dictionary metrics orchestrator (thin; deps injected).
 *
 * Computes recall@gold + precision@(re-verified sample) for a language, runs the
 * monotonic-quality gate against the trailing precision baseline, and persists a
 * `dictionary_quality_metrics` row. Metrics are ALWAYS recorded; the gate result
 * is returned so the caller can skip/alert on a precision regression.
 */
import { normalizeWord } from '@/shared/utils/wordNormalization';
import { computePrecisionFromSample, computeRecallAtGold, qualityGate, type GateResult } from './metrics';
import type { LangCode } from './types';

export interface MetricsDeps {
  loadGoldValid: (lang: LangCode) => Promise<string[]>;
  /** Known-INVALID words — any that the dict accepts is a concrete false-accept. */
  loadGoldInvalid?: (lang: LangCode) => Promise<string[]>;
  /** Live dictionary membership (normalized word). Sync, in-memory. */
  has: (normalizedWord: string) => boolean;
  /** A bounded sample of currently-accepted words to re-verify for garbage. */
  sampleAcceptedWords: (lang: LangCode, n: number) => Promise<string[]>;
  /** Strict re-verification — does the accepted word still hold up? */
  reverify: (lang: LangCode, word: string) => Promise<boolean>;
  dictSize: (lang: LangCode) => Promise<number>;
  /** Trailing precision baseline (null if none). */
  loadPrevPrecision: (lang: LangCode) => Promise<number | null>;
  save: (row: Record<string, unknown>) => Promise<void>;
  log?: (msg: string) => void;
}

export interface MetricsResult {
  lang: LangCode;
  recall: number;
  precision: number;
  gate: GateResult;
}

export async function runDictionaryMetrics(
  lang: LangCode,
  opts: { sampleN?: number; tolerance?: number; deps: MetricsDeps },
): Promise<MetricsResult> {
  const { sampleN = 200, tolerance = 0.02, deps } = opts;

  const gold = await deps.loadGoldValid(lang);
  const recall = computeRecallAtGold(deps.has, gold, lang);

  const sampleWords = await deps.sampleAcceptedWords(lang, sampleN);
  const sample: Array<{ word: string; holds: boolean }> = [];
  for (const w of sampleWords) {
    sample.push({ word: w, holds: await deps.reverify(lang, w) });
  }
  const precision = computePrecisionFromSample(sample);

  // Specificity check: any known-invalid gold word the dict accepts is a
  // concrete false-accept (cheaper + more pointed than the network sample).
  let goldInvalidN = 0;
  let goldInvalidAccepted = 0;
  if (deps.loadGoldInvalid) {
    const goldInvalid = await deps.loadGoldInvalid(lang);
    goldInvalidN = goldInvalid.length;
    for (const w of goldInvalid) {
      const norm = normalizeWord(String(w).trim(), lang as never);
      if (norm && deps.has(norm)) goldInvalidAccepted += 1;
    }
  }

  const prev = await deps.loadPrevPrecision(lang);
  const gate = qualityGate(prev, precision.precision, tolerance);
  const dictSize = await deps.dictSize(lang);

  const noteParts = [gate.ok ? gate.reason : `GATE FAIL: ${gate.reason}`];
  if (goldInvalidAccepted > 0) noteParts.push(`gold_invalid_accepted=${goldInvalidAccepted}/${goldInvalidN}`);

  await deps.save({
    language: lang,
    dict_size: dictSize,
    recall_at_gold: recall.recall,
    precision_sample: precision.precision,
    gold_valid_n: recall.total,
    gold_invalid_n: goldInvalidN,
    garbage_flagged: precision.total - precision.held,
    notes: noteParts.join('; '),
  });

  deps.log?.(
    `[metrics ${lang}] recall=${recall.recall.toFixed(3)} (${recall.present}/${recall.total}) ` +
      `precision=${precision.precision.toFixed(3)} (${precision.held}/${precision.total}) gate=${gate.ok ? 'ok' : 'FAIL'}`,
  );

  return { lang, recall: recall.recall, precision: precision.precision, gate };
}
