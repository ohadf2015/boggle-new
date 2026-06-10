/**
 * Word Tower — Roguelike Perk Draft (pure).
 *
 * The "surprises & upgrades" pillar. Inside the BOUNDED DAILY run (never the
 * endless monotonic board), every ~100m the climber is offered a pick-1-of-3
 * draft of boons. Perks are word→physics flavoured, not generic %: they change
 * how the crane, the brink, and a collapse behave.
 *
 * Every perk folds into a single {@link PerkModifiers} object, so the rest of the
 * game reads one struct at a handful of control points instead of scattering perk
 * checks everywhere — and the whole system stays unit-testable as pure functions.
 */

export type PerkId = 'masterCrane' | 'tallTimber' | 'featherfall' | 'reinforced' | 'cushion';

export interface Perk {
  id: PerkId;
  icon: string;
  nameKey: string;
  descKey: string;
}

export const PERKS: Record<PerkId, Perk> = {
  masterCrane: { id: 'masterCrane', icon: '🏗️', nameKey: 'wordTower.perk.masterCrane.name', descKey: 'wordTower.perk.masterCrane.desc' },
  tallTimber:  { id: 'tallTimber',  icon: '🌲', nameKey: 'wordTower.perk.tallTimber.name',  descKey: 'wordTower.perk.tallTimber.desc' },
  featherfall: { id: 'featherfall', icon: '🪶', nameKey: 'wordTower.perk.featherfall.name', descKey: 'wordTower.perk.featherfall.desc' },
  reinforced:  { id: 'reinforced',  icon: '🧱', nameKey: 'wordTower.perk.reinforced.name',  descKey: 'wordTower.perk.reinforced.desc' },
  cushion:     { id: 'cushion',     icon: '🛟', nameKey: 'wordTower.perk.cushion.name',     descKey: 'wordTower.perk.cushion.desc' },
};

export const ALL_PERK_IDS: PerkId[] = Object.keys(PERKS) as PerkId[];

export interface PerkModifiers {
  /** Extra height multiplier added on a PERFECT crane drop. */
  perfectBonus: number;
  /** Global multiplier on every floor's height gain (≥ 1). */
  heightMult: number;
  /** Floors subtracted from any topple/hazard (≥ 0). */
  toppleReduction: number;
  /** Added to the clutch brink threshold — more bad drops before do-or-die. */
  brinkExtra: number;
  /** Crane wobble topples zero floors (pure recovery). */
  wobbleImmune: boolean;
}

export const NO_MODIFIERS: PerkModifiers = {
  perfectBonus: 0,
  heightMult: 1,
  toppleReduction: 0,
  brinkExtra: 0,
  wobbleImmune: false,
};

/** How far apart perk drafts are offered (metres of new altitude). */
export const PERK_MILESTONE_STEP_M = 100;

/**
 * Pick `count` distinct perks the player doesn't already own, using a seeded rng
 * (deterministic for the daily seed). Returns fewer if fewer remain.
 */
export function drawPerkChoices(rng: () => number, owned: PerkId[], count = 3): PerkId[] {
  const pool = ALL_PERK_IDS.filter((id) => !owned.includes(id));
  // Fisher–Yates with the supplied rng.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Fold the owned perks into one effect object. */
export function perkModifiers(owned: PerkId[]): PerkModifiers {
  const m: PerkModifiers = { ...NO_MODIFIERS };
  for (const id of owned) {
    switch (id) {
      case 'masterCrane': m.perfectBonus += 0.3; break;
      case 'tallTimber':  m.heightMult *= 1.12; break;
      case 'featherfall': m.toppleReduction += 1; break;
      case 'reinforced':  m.brinkExtra += 1; break;
      case 'cushion':     m.wobbleImmune = true; break;
    }
  }
  return m;
}

/** Apply featherfall: floors actually lost in a topple, never below zero. */
export function reducedTopple(floors: number, mods: PerkModifiers): number {
  return Math.max(0, floors - mods.toppleReduction);
}

/**
 * Fold a partial modifier set (e.g. a daily mutator's structural effects) onto a
 * base PerkModifiers, COMBINING by each field's own algebra rather than a naive
 * spread: multipliers multiply, additive bonuses add, booleans OR. So a
 * skyline-rush day stacks ON TOP of a tallTimber perk instead of clobbering it.
 */
export function combineModifiers(base: PerkModifiers, extra: Partial<PerkModifiers>): PerkModifiers {
  return {
    perfectBonus: base.perfectBonus + (extra.perfectBonus ?? 0),
    heightMult: base.heightMult * (extra.heightMult ?? 1),
    toppleReduction: base.toppleReduction + (extra.toppleReduction ?? 0),
    brinkExtra: base.brinkExtra + (extra.brinkExtra ?? 0),
    wobbleImmune: base.wobbleImmune || (extra.wobbleImmune ?? false),
  };
}

/**
 * The milestone index newly crossed between `prevHeightM` and `nextHeightM`, or
 * null if none — i.e. the player just passed a fresh PERK_MILESTONE_STEP_M
 * boundary and a draft should open. (Returns the highest crossed index.)
 */
export function perkMilestoneAt(prevHeightM: number, nextHeightM: number): number | null {
  const prevIdx = Math.floor(prevHeightM / PERK_MILESTONE_STEP_M);
  const nextIdx = Math.floor(nextHeightM / PERK_MILESTONE_STEP_M);
  return nextIdx > prevIdx ? nextIdx : null;
}
