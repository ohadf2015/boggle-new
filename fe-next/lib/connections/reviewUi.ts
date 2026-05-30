/**
 * Admin connection-puzzle review — pure UI helpers (row building, source
 * classification, filtering). No React; fully testable.
 */
import type { ConnectionPuzzle } from './types';

export type PuzzleSource = 'curated' | 'generated' | 'online';

/** Classify a puzzle by its id: he-g-* generated, *-o-* online-curated, else hand-curated. */
export function sourceOf(id: string): PuzzleSource {
  if (/-g-/.test(id)) return 'generated';
  if (/-o-/.test(id)) return 'online';
  return 'curated';
}

export interface ReviewRow {
  id: string;
  language: string;
  word1: string;
  word2: string;
  bridge: string;
  difficulty: string;
  source: PuzzleSource;
  /** word1 + bridge (the first implied phrase). */
  phrase1: string;
  /** bridge + word2 (the second implied phrase). */
  phrase2: string;
}

function rowsFor(puzzles: ConnectionPuzzle[], language: string): ReviewRow[] {
  return puzzles.map((p) => ({
    id: p.id,
    language,
    word1: p.word1,
    word2: p.word2,
    bridge: p.bridge,
    difficulty: p.difficulty,
    source: sourceOf(p.id),
    phrase1: `${p.word1} ${p.bridge}`,
    phrase2: `${p.bridge} ${p.word2}`,
  }));
}

/** Flatten the per-locale pools into review rows. */
export function buildReviewRows(pools: { he: ConnectionPuzzle[]; en: ConnectionPuzzle[] }): ReviewRow[] {
  return [...rowsFor(pools.he, 'he'), ...rowsFor(pools.en, 'en')];
}

export interface ReviewFilter {
  language: 'all' | 'he' | 'en';
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
  source: 'all' | PuzzleSource;
  status: 'all' | 'unreviewed' | 'good' | 'bad' | 'unsure';
}

/** Filter rows by language/difficulty/source/review-status. `verdicts` maps puzzleId → verdict. */
export function filterRows(rows: ReviewRow[], f: ReviewFilter, verdicts: Record<string, string>): ReviewRow[] {
  return rows.filter((r) => {
    if (f.language !== 'all' && r.language !== f.language) return false;
    if (f.difficulty !== 'all' && r.difficulty !== f.difficulty) return false;
    if (f.source !== 'all' && r.source !== f.source) return false;
    if (f.status === 'all') return true;
    const v = verdicts[r.id];
    if (f.status === 'unreviewed') return !v;
    return v === f.status;
  });
}
