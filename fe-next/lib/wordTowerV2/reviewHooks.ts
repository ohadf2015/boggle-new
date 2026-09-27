import { sanitizeWords } from './wreck';

export function canUseV2ReviewHooks(auth: {
  canSeeInWorkModes?: boolean;
  isAdmin?: boolean;
}): boolean {
  return Boolean(auth.canSeeInWorkModes || auth.isAdmin);
}

export type V2ReviewHooks = {
  demo: boolean;
  results: boolean;
  smash: boolean;
  words: string[];
};

/** `?demo=1` review hooks. Staff only — ordinary players get a normal game. */
export function v2ReviewHooksFromSearch(search: string, staff: boolean): V2ReviewHooks {
  const empty: V2ReviewHooks = { demo: false, results: false, smash: false, words: [] };
  if (!staff) return empty;
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const demo = params.has('demo');
  if (!demo) return empty;
  return {
    demo: true,
    results: params.has('results'),
    smash: params.has('smash'),
    words: sanitizeWords(params.get('words')?.split(',') ?? []),
  };
}
