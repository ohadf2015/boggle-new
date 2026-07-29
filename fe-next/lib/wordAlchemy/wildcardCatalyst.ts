/**
 * Word Alchemy — Wildcard Catalyst
 *
 * 1 in 3 puzzles (deterministic per puzzle ID) hide a "Philosopher's Stone"
 * word. If the player types it on the first transformation step, that step
 * is skipped and the ✨ Philosopher's Stone modal fires.
 *
 * Seeded via FNV-1a hash so the result is reproducible, offline, and free
 * of any server round-trip. Same puzzle → same catalyst (or no catalyst)
 * on every device, encouraging re-discovery across replays.
 */

/** Alchemical / mystical catalyst words — uppercase letters only. */
export const CATALYST_WORDS = [
  'GOLD',
  'FIRE',
  'SPARK',
  'ASH',
  'SALT',
  'OIL',
  'IRON',
  'GEM',
  'RUBY',
  'OPAL',
] as const;

export type CatalystWord = (typeof CATALYST_WORDS)[number];

export interface WildcardCatalyst {
  /** Whether this puzzle has an active wildcard this session. */
  active: boolean;
  /** The word to type to trigger the skip. Null when inactive. */
  wildWord: CatalystWord | null;
  /**
   * The step index at which typing `wildWord` skips the step (0-indexed).
   * Always 0 — skips the first transformation step.
   */
  triggerStepIdx: number;
}

/**
 * FNV-1a 32-bit hash mapped to [0, 1).
 * Deterministic, pure, no external dependencies.
 */
function seededRandom(seed: string): number {
  let h = 2166136261; // FNV-1a offset basis (32-bit)
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime
    h >>>= 0;                   // keep unsigned 32-bit
  }
  return h / 4294967296;
}

/**
 * Returns the wildcard catalyst state for a puzzle.
 *
 * Active for ~1/3 of puzzles (seeded by `puzzleId`). When active,
 * `wildWord` is the hidden catalyst that triggers a step skip.
 */
export function getWildcardCatalyst(puzzleId: string): WildcardCatalyst {
  const activationRoll = seededRandom(`${puzzleId}:activate`);
  const active = activationRoll < 1 / 3;

  if (!active) {
    return { active: false, wildWord: null, triggerStepIdx: 0 };
  }

  const wordRoll = seededRandom(`${puzzleId}:word`);
  const wordIdx = Math.floor(wordRoll * CATALYST_WORDS.length);

  return {
    active: true,
    wildWord: CATALYST_WORDS[wordIdx],
    triggerStepIdx: 0,
  };
}
