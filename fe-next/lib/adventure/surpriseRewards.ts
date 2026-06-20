/**
 * Variable-reward "surprise" system.
 *
 * Breaks the "same level over and over" feel by giving each level a chance at an
 * UNEXPECTED bonus event. Deterministic per (world, level) — so a given level has
 * its own identity rather than feeling like slot-machine noise — but varied across
 * levels, and both more likely and bigger in later worlds (rising stakes).
 *
 * Purely ADDITIVE: a surprise only ever grants extra. It never reduces a reward,
 * so it can never make a level feel punishing. Pure logic — safe to wire into the
 * level-complete reward path without touching difficulty/objective balance.
 */

/**
 * Flag-dark master switch. Default OFF: with it false, the loot path is
 * byte-identical to before (balance + reward tests unaffected). Flip to true —
 * or wire to a runtime flag — once the surprise announcement UI + i18n land.
 */
export const ADVENTURE_SURPRISES_ENABLED = true;

export type SurpriseKind =
  | 'doubleGold' // this level's gold is doubled
  | 'bonusChest' // an extra chest of gems/gold
  | 'luckyGems' // a windfall of gems
  | 'goldenWord' // a hidden bonus word was worth a jackpot
  | 'comboFrenzy'; // combo rewards counted double this level

export const SURPRISE_KINDS: SurpriseKind[] = [
  'doubleGold',
  'bonusChest',
  'luckyGems',
  'goldenWord',
  'comboFrenzy',
];

export interface LevelSurprise {
  kind: SurpriseKind;
  /** Effect size — for doubleGold this is the gold multiplier; for others, a magnitude. */
  magnitude: number;
  labelKey: string;
  descKey: string;
}

const L = (kind: SurpriseKind, part: 'label' | 'desc') => `adventure.surprise.${kind}.${part}`;

/** Probability a level rolls a surprise — climbs from ~22% (W1) to ~58% (W10). */
export function surpriseChance(world: number): number {
  const w = Math.max(1, Math.min(10, world));
  return Math.min(1, 0.18 + w * 0.04);
}

/**
 * Small deterministic hash → [0, 1). Mulberry-ish; no Math.random so the same
 * level always yields the same surprise (fair + identity), varying by level.
 */
function seededUnit(world: number, level: number, salt: number): number {
  let h = (world * 73856093) ^ (level * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Magnitude per kind, scaling with world depth. */
function magnitudeFor(kind: SurpriseKind, world: number): number {
  switch (kind) {
    case 'doubleGold':
      return 2; // multiplier
    case 'comboFrenzy':
      return 2; // multiplier
    case 'bonusChest':
      return 20 + world * 10;
    case 'luckyGems':
      return 2 + Math.floor(world / 2);
    case 'goldenWord':
      return 30 + world * 15;
  }
}

/** Roll this level's surprise (or null). Deterministic per (world, level). */
export function rollLevelSurprise(world: number, level: number): LevelSurprise | null {
  if (seededUnit(world, level, 1) >= surpriseChance(world)) return null;
  const kind = SURPRISE_KINDS[Math.floor(seededUnit(world, level, 2) * SURPRISE_KINDS.length)];
  return {
    kind,
    magnitude: magnitudeFor(kind, world),
    labelKey: L(kind, 'label'),
    descKey: L(kind, 'desc'),
  };
}

/** Apply a surprise's gold effect (additive only). */
export function applySurpriseToGold(baseGold: number, surprise: LevelSurprise | null): number {
  if (!surprise) return baseGold;
  switch (surprise.kind) {
    case 'doubleGold':
      return Math.round(baseGold * surprise.magnitude);
    case 'bonusChest':
    case 'goldenWord':
      return baseGold + surprise.magnitude;
    default:
      return baseGold; // luckyGems/comboFrenzy reward other currencies
  }
}
