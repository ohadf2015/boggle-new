/**
 * Community (UGC) Word Bridge riddles — pure validation + ranking.
 *
 * Players suggest riddles (word1 + word2 + bridge). Submissions land 'pending'
 * for moderation; approved ones surface in a community list ranked by upvotes
 * (the "dynamic ranking"). This module owns the rules; the API route owns the DB.
 */
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
export const MAX_UGC_WORD_LEN = 24;
const MAX_NAME_LEN = 50;

export interface UgcSubmission {
  word1: string;
  word2: string;
  bridge: string;
  language: string;
  displayName: string;
}

export type UgcValidation = { ok: true; value: UgcSubmission } | { ok: false; error: string };

function cleanWord(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t.length < 1 || t.length > MAX_UGC_WORD_LEN) return null;
  return t;
}

export function validateUgcSubmission(body: unknown): UgcValidation {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };
  const b = body as Record<string, unknown>;

  const word1 = cleanWord(b.word1);
  const word2 = cleanWord(b.word2);
  const bridge = cleanWord(b.bridge);
  if (!word1 || !word2 || !bridge) return { ok: false, error: 'word1, word2 and bridge are required (1-24 chars)' };

  // Reject degenerate riddles: the bridge must differ from both clue words, and
  // the two clue words must differ (else it's not a real bridge puzzle).
  if (bridge === word1 || bridge === word2) return { ok: false, error: 'bridge must differ from both words' };
  if (word1 === word2) return { ok: false, error: 'the two words must differ' };

  if (typeof b.language !== 'string' || !LANGUAGES.includes(b.language)) {
    return { ok: false, error: 'invalid language' };
  }
  if (typeof b.displayName !== 'string' || b.displayName.trim().length < 1 || b.displayName.length > MAX_NAME_LEN) {
    return { ok: false, error: 'invalid displayName' };
  }

  return { ok: true, value: { word1, word2, bridge, language: b.language, displayName: b.displayName.trim() } };
}

export interface RankableUgc {
  upvotes: number;
  created_at: string;
}

/** Sort approved riddles by upvotes desc, then earliest submitted (stable, pure). */
export function rankUgc<T extends RankableUgc>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.upvotes - a.upvotes || a.created_at.localeCompare(b.created_at));
}
