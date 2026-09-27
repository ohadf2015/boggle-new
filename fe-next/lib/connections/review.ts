/**
 * Admin connection-puzzle review — pure validation for the bulk-verdict upsert.
 *
 * An admin marks each puzzle good / bad / unsure in the review tool; the batch
 * is upserted to connections_puzzle_reviews. Bad-flagged rows later feed the
 * nightly improvement loop. This module owns the rules; the API owns the DB.
 */
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const VERDICTS = ['good', 'bad', 'unsure'] as const;
export const MAX_REVIEW_BATCH = 1000;
const MAX_NOTE_LEN = 500;

export type Verdict = (typeof VERDICTS)[number];

export interface ReviewItem {
  puzzleId: string;
  language: string;
  word1: string;
  word2: string;
  bridge: string;
  verdict: Verdict;
  note?: string;
}

export type ReviewBatchResult = { ok: true; verdicts: ReviewItem[] } | { ok: false; error: string };

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

export function validateReviewBatch(body: unknown): ReviewBatchResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };
  const list = (body as Record<string, unknown>).verdicts;
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: 'verdicts must be a non-empty array' };
  if (list.length > MAX_REVIEW_BATCH) return { ok: false, error: `batch too large (max ${MAX_REVIEW_BATCH})` };

  const out: ReviewItem[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid item' };
    const r = raw as Record<string, unknown>;
    const puzzleId = str(r.puzzleId);
    const word1 = str(r.word1);
    const word2 = str(r.word2);
    const bridge = str(r.bridge);
    if (!puzzleId || !word1 || !word2 || !bridge) return { ok: false, error: `missing fields for ${puzzleId ?? '?'}` };
    if (typeof r.language !== 'string' || !LANGUAGES.includes(r.language)) {
      return { ok: false, error: `invalid language for ${puzzleId}` };
    }
    if (typeof r.verdict !== 'string' || !VERDICTS.includes(r.verdict as Verdict)) {
      return { ok: false, error: `invalid verdict for ${puzzleId}` };
    }
    const note = typeof r.note === 'string' ? r.note.slice(0, MAX_NOTE_LEN) : undefined;
    out.push({ puzzleId, language: r.language, word1, word2, bridge, verdict: r.verdict as Verdict, note });
  }
  return { ok: true, verdicts: out };
}

/** Count verdicts by value — for the admin summary header. */
export function reviewSummary(rows: { verdict: string }[]): Record<Verdict | 'total', number> {
  const s = { good: 0, bad: 0, unsure: 0, total: rows.length };
  for (const r of rows) if (r.verdict in s) (s as Record<string, number>)[r.verdict]++;
  return s;
}
