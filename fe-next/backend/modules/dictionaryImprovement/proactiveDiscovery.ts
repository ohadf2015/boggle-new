/**
 * Proactive discovery orchestrator (thin; deps injected).
 *
 * Loads bundled/LLM-generated candidate words for a language, prioritizes them
 * (novel-only, frequency-ranked, bounded), and enqueues the batch into the
 * EXISTING verification queue (invalid_word_submissions, verification_source=
 * 'proactive'). The existing verifier + auto-promotion + offensive gates then
 * decide what is actually promoted — this layer only fills the funnel.
 *
 * Novelty is resolved by an injected `filterNovel` (a DB lookup in production),
 * keeping prioritizeCandidates pure/sync and this module unit-testable.
 */
import { prioritizeCandidates } from './candidates';
import type { Candidate, LangCode } from './types';

export interface DiscoveryDeps {
  loadCandidateWords: (lang: LangCode) => Promise<string[]>;
  /** normalizedWord -> frequency rank (lower = more frequent). Optional. */
  freqRank?: (lang: LangCode) => Promise<Map<string, number>>;
  /** Returns the subset of normalized words NOT already in dict/queue. */
  filterNovel: (lang: LangCode, normalizedWords: string[]) => Promise<string[]>;
  /** Inserts the batch into the verification queue; returns rows queued. */
  enqueue: (lang: LangCode, words: Candidate[]) => Promise<number>;
  log?: (msg: string) => void;
}

export interface DiscoveryResult {
  lang: LangCode;
  considered: number;
  novel: number;
  queued: number;
}

export async function runProactiveDiscovery(
  lang: LangCode,
  opts: { limit?: number; deps: DiscoveryDeps; source?: string },
): Promise<DiscoveryResult> {
  const { limit = 200, deps, source = 'proactive' } = opts;

  const raw = await deps.loadCandidateWords(lang);
  const freq = deps.freqRank ? await deps.freqRank(lang) : undefined;

  // Normalize / form-filter / dedup / frequency-rank — unbounded first pass.
  const prelim = prioritizeCandidates(raw, {
    lang,
    isKnown: () => false,
    freqRank: freq,
    limit: Number.MAX_SAFE_INTEGER,
    source,
  });
  const considered = prelim.length;
  if (considered === 0) {
    deps.log?.(`[proactive ${lang}] no acceptable candidates`);
    return { lang, considered: 0, novel: 0, queued: 0 };
  }

  const novelWords = await deps.filterNovel(lang, prelim.map((c) => c.word));
  const novelSet = new Set(novelWords);
  const batch = prelim.filter((c) => novelSet.has(c.word)).slice(0, Math.max(0, limit));

  let queued = 0;
  if (batch.length > 0) queued = await deps.enqueue(lang, batch);

  deps.log?.(`[proactive ${lang}] considered=${considered} novel=${novelSet.size} queued=${queued}`);
  return { lang, considered, novel: novelSet.size, queued };
}
