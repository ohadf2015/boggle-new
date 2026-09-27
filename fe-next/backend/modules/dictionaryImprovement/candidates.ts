/**
 * Proactive candidate prioritization (pure).
 *
 * Turns a raw list of candidate words into a deduped, novel-only,
 * frequency-ranked, bounded list of acceptable-form words for a language.
 * The output feeds invalid_word_submissions (verification_source='proactive'),
 * where the EXISTING verifier + auto-promotion + offensive gates take over.
 */
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Candidate, LangCode } from './types';

/** Per-language acceptable character set, applied to the NORMALIZED form. */
const FORM_RE: Record<LangCode, RegExp> = {
  // latin a–z after lowercasing
  en: /^[a-z]+$/,
  // Swedish adds å ä ö
  sv: /^[a-zåäö]+$/,
  // Spanish: accents are folded by normalizeWord; ñ is preserved
  es: /^[a-zñ]+$/,
  // Hebrew letters alef–tav (sofit forms folded by normalizeWord)
  he: /^[א-ת]+$/,
  // Japanese: hiragana block + prolonged-sound mark (ー). Katakana/kanji rejected
  // — the JA validation set is hiragana-only (correct for boards).
  ja: /^[ぁ-ゖー]+$/,
};

/**
 * Is `word` an acceptable surface form for `lang`? Checks the form as-given;
 * callers normalize first when they want the canonical key checked.
 */
export function isAcceptableForm(word: string, lang: LangCode): boolean {
  if (!word) return false;
  return FORM_RE[lang].test(word);
}

export interface PrioritizeOptions {
  lang: LangCode;
  /** Returns true if the normalized word is already in the dictionary/queue. */
  isKnown: (normalizedWord: string) => boolean;
  /** normalizedWord -> frequency rank (lower = more frequent). */
  freqRank?: Map<string, number>;
  /** Max words to return. Default 200 (a bounded nightly batch). */
  limit?: number;
  source?: string;
}

/**
 * Normalize → filter (acceptable form, novel) → dedup → rank by frequency
 * (known ranks first, ascending; unknown-frequency words keep input order) →
 * bound. Deterministic and pure.
 */
export function prioritizeCandidates(rawWords: string[], opts: PrioritizeOptions): Candidate[] {
  const { lang, isKnown, freqRank, limit = 200, source } = opts;
  const seen = new Set<string>();
  const kept: Array<{ word: string; rank: number; idx: number }> = [];

  rawWords.forEach((raw, idx) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const norm = normalizeWord(trimmed, lang as never);
    if (!norm || !isAcceptableForm(norm, lang)) return;
    if (seen.has(norm)) return;
    if (isKnown(norm)) return;
    seen.add(norm);
    const rank = freqRank?.get(norm);
    kept.push({ word: norm, rank: rank ?? Number.POSITIVE_INFINITY, idx });
  });

  // Stable sort: ascending frequency rank, ties (incl. unknown=Infinity) by input order.
  kept.sort((a, b) => (a.rank - b.rank) || (a.idx - b.idx));

  return kept.slice(0, Math.max(0, limit)).map((k) => ({
    word: k.word,
    lang,
    freqRank: Number.isFinite(k.rank) ? k.rank : undefined,
    source,
  }));
}
