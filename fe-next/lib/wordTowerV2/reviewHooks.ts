import { sanitizeWords } from './wreck';

export interface ReviewHooks {
  seed: boolean;
  words: string[];
  results: boolean;
  smash: boolean;
}

const CLOSED: ReviewHooks = { seed: false, words: [], results: false, smash: false };

/**
 * `?demo=1` review hooks (seed tower / jump to results / smash).
 * Ungated they are a public cheat: anyone can skip the climb.
 * Admins only — beta testers play the real game.
 */
export function parseReviewHooks(search: string, opts: { isAdmin: boolean }): ReviewHooks {
  if (!opts.isAdmin) return CLOSED;
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  if (!params.has('demo')) return CLOSED;
  return {
    seed: true,
    words: sanitizeWords(params.get('words')?.split(',') ?? []),
    results: params.has('results'),
    smash: params.has('smash'),
  };
}
