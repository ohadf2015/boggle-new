/**
 * Per-mode personal-best score for WordCraft single-player, persisted to
 * localStorage. WordCraft tracked no best score before — finishing a game gave
 * no sense of progression. Kept tiny + SSR-safe; the "new best" flag drives a
 * one-shot celebration (badge + achievement sound) at game over.
 */
export type WordCraftBestMode = 'territory' | 'classic';

const KEY_PREFIX = 'wc_best_';

function keyFor(mode: WordCraftBestMode): string {
  return `${KEY_PREFIX}${mode}`;
}

export function readBest(mode: WordCraftBestMode): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(keyFor(mode));
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export interface BestResult {
  best: number;
  isNewBest: boolean;
}

export function recordBest(mode: WordCraftBestMode, score: number): BestResult {
  const prev = readBest(mode);
  if (score <= 0 || score <= prev) {
    return { best: prev, isNewBest: false };
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(keyFor(mode), String(score));
    } catch {
      /* storage full / blocked — celebrate anyway, just don't persist */
    }
  }
  return { best: score, isNewBest: true };
}
