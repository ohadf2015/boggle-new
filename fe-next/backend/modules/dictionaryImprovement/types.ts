/**
 * Shared types for the proactive dictionary-improvement layer.
 * See docs/2026-06-04-dictionary-extensive-improvement-spec.md.
 */

/** The five game languages with curated dictionaries. */
export type LangCode = 'en' | 'he' | 'sv' | 'ja' | 'es';

export const DICTIONARY_LANGS: readonly LangCode[] = ['en', 'he', 'sv', 'ja', 'es'];

/** A normalized candidate word headed for the verify→promote gates. */
export interface Candidate {
  /** Normalized, acceptable-form word (what would be stored/validated). */
  word: string;
  lang: LangCode;
  /** Lower = more frequent; undefined = unknown frequency. */
  freqRank?: number;
  /** Provenance: 'freq' | 'jmdict' | 'llm' | 'morph' | ... */
  source?: string;
}

/** A single LLM judge's verdict on a candidate. */
export interface JudgeVote {
  valid: boolean;
  confidence: number; // 0..1
}

/** Combined signals fed to the ensemble. */
export interface EnsembleSignals {
  /** Deterministic authority result (Wiktionary/Jisho/milog). */
  deterministic?: 'verified' | 'not_found' | 'rejected' | null;
  judges?: JudgeVote[];
  /** Did the candidate clear its language frequency floor? */
  freqOk?: boolean;
  /** Offensive-filter hit — a hard block. */
  offensive?: boolean;
}

export type Decision = 'promote' | 'reject' | 'review';

export interface EnsembleResult {
  decision: Decision;
  reason: string;
  support: number;
}
