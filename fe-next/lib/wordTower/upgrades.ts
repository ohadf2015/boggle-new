/**
 * Word Tower — persistent upgrade economy (pure).
 *
 * Coins earned while climbing buy PERMANENT upgrades that bias a run in the
 * player's favour: a calmer crane, a wider "perfect" window, gentler wind, fatter
 * rewards, a tougher tower, and faster recovery. This is the meta-progression
 * hook — a reason to start another run ("one more climb to afford Wide Footing").
 *
 * Everything here is pure + clamped: a corrupt/hacked save can never push an
 * effect past its design ceiling, and effects stay gentle enough that the crane
 * stays a skill check, not a formality.
 */

export type UpgradeId =
  | 'steadyCable' // slows the crane sweep → easier timing
  | 'wideFooting' // widens the "perfect" landing window
  | 'windbreak' // calmer shaft wind / sway
  | 'masterArchitect' // bigger coin rewards
  | 'reinforcedCore' // extra wobble before a topple
  | 'quickRecovery' // faster lean recovery after a clean drop
  | 'tailwind' // every floor is a little taller (climb faster)
  | 'salvage' // a topple/hazard knocks fewer floors off
  | 'momentum' // perfect drops pay an even bigger streak bonus
  | 'centerMagnet'; // bad drops still pull the tower back toward center

export const UPGRADE_IDS: readonly UpgradeId[] = [
  'steadyCable',
  'wideFooting',
  'windbreak',
  'masterArchitect',
  'reinforcedCore',
  'quickRecovery',
  'tailwind',
  'salvage',
  'momentum',
  'centerMagnet',
] as const;

/**
 * Every upgrade is now WIRED into the live run, so the shop never sells a no-op:
 *  - steadyCable → crane sweep speed
 *  - wideFooting → perfect-landing band widen (crane)
 *  - windbreak → ambient sway/wind intensity
 *  - masterArchitect → coin reward multiplier
 *  - reinforcedCore → extra wobble before a topple (brink)
 *  - quickRecovery → faster visible lean recovery after a clean drop
 *  - tailwind → global height multiplier on every floor
 *  - salvage → fewer floors lost to a topple/hazard
 *  - momentum → fatter perfect-streak bonus
 *  - centerMagnet → passive lean pull toward center on EVERY drop (even misses)
 */
export const LIVE_UPGRADE_IDS: readonly UpgradeId[] = UPGRADE_IDS;

export interface UpgradeDef {
  /** Hard cap on levels. */
  maxLevel: number;
  /** Cost of the FIRST level (level 0 → 1), in coins. */
  baseCost: number;
  /** Multiplicative cost growth per level (each tier ~`costGrowth`× the last). */
  costGrowth: number;
  /** Per-level effect magnitude (interpreted per upgrade in computeEffects). */
  perLevel: number;
}

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  steadyCable: { maxLevel: 5, baseCost: 150, costGrowth: 1.7, perLevel: 0.08 },
  wideFooting: { maxLevel: 4, baseCost: 220, costGrowth: 1.8, perLevel: 0.03 },
  windbreak: { maxLevel: 4, baseCost: 180, costGrowth: 1.7, perLevel: 0.12 },
  masterArchitect: { maxLevel: 5, baseCost: 200, costGrowth: 1.75, perLevel: 0.1 },
  reinforcedCore: { maxLevel: 2, baseCost: 400, costGrowth: 2.2, perLevel: 1 },
  quickRecovery: { maxLevel: 3, baseCost: 260, costGrowth: 1.8, perLevel: 0.4 },
  tailwind: { maxLevel: 5, baseCost: 240, costGrowth: 1.8, perLevel: 0.06 },
  salvage: { maxLevel: 3, baseCost: 320, costGrowth: 1.9, perLevel: 1 },
  momentum: { maxLevel: 4, baseCost: 280, costGrowth: 1.8, perLevel: 0.1 },
  // Per-level passive lean-reset multiplier added on EVERY drop (even misses).
  // At level 3 the multiplier is 1.75 — each bad drop still nudges the tower
  // noticeably toward centre rather than letting the lean pile up indefinitely.
  centerMagnet: { maxLevel: 3, baseCost: 350, costGrowth: 2.0, perLevel: 0.25 },
};

export type UpgradeLevels = Partial<Record<UpgradeId, number>>;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Current owned level of an upgrade, clamped to [0, maxLevel] (corrupt-save safe). */
export function levelOf(levels: UpgradeLevels, id: UpgradeId): number {
  return clamp(Math.floor(levels[id] ?? 0), 0, UPGRADE_DEFS[id].maxLevel);
}

export function isMaxed(id: UpgradeId, currentLevel: number): boolean {
  return currentLevel >= UPGRADE_DEFS[id].maxLevel;
}

/** Coin cost to buy the NEXT level from `currentLevel`; Infinity once maxed. */
export function upgradeCost(id: UpgradeId, currentLevel: number): number {
  const def = UPGRADE_DEFS[id];
  if (currentLevel >= def.maxLevel) return Infinity;
  return Math.round(def.baseCost * Math.pow(def.costGrowth, Math.max(0, currentLevel)));
}

export function canAfford(coins: number, id: UpgradeId, currentLevel: number): boolean {
  return coins >= upgradeCost(id, currentLevel);
}

export interface PurchaseResult {
  ok: boolean;
  levels: UpgradeLevels;
  coins: number;
}

/**
 * Pure purchase: returns a NEW levels map + remaining coins. Refuses (ok:false,
 * inputs echoed) if maxed or unaffordable. Never mutates the input map.
 */
export function purchase(levels: UpgradeLevels, coins: number, id: UpgradeId): PurchaseResult {
  const cur = levelOf(levels, id);
  const cost = upgradeCost(id, cur);
  if (isMaxed(id, cur) || coins < cost) {
    return { ok: false, levels, coins };
  }
  return { ok: true, levels: { ...levels, [id]: cur + 1 }, coins: coins - cost };
}

export interface UpgradeEffects {
  /** Crane sweep speed multiplier (<1 = slower = easier timing). */
  sweepSpeedMult: number;
  /** Added to the PERFECT band half-width (wider perfect window). */
  perfectBandBonus: number;
  /** Shaft-wind / sway intensity multiplier (<1 = calmer). */
  windMult: number;
  /** Coin reward multiplier (>1 = fatter rewards). */
  rewardMult: number;
  /** Extra sloppy drops tolerated before a topple. */
  extraTopple: number;
  /** Lean-recovery speed multiplier (>1 = snaps back faster). */
  leanResetMult: number;
  /** Global height multiplier on every floor (>1 = taller floors, faster climb). */
  heightMult: number;
  /** Floors subtracted from any topple/hazard (≥ 0 = a softer collapse). */
  toppleReduction: number;
  /** Added to the per-drop PERFECT streak bonus (fatter perfect payouts). */
  perfectBonus: number;
  /** Passive lean-pull multiplier applied on EVERY drop, including misses (>1 = nudges toward centre). */
  passiveLeanReset: number;
}

export const NEUTRAL_EFFECTS: UpgradeEffects = {
  sweepSpeedMult: 1,
  perfectBandBonus: 0,
  windMult: 1,
  rewardMult: 1,
  extraTopple: 0,
  leanResetMult: 1,
  heightMult: 1,
  toppleReduction: 0,
  perfectBonus: 0,
  passiveLeanReset: 1,
};

/**
 * Fold owned levels into the single effects bundle the run reads. Each upgrade
 * scales by its own clamped level × perLevel magnitude, then the whole bundle is
 * clamped to design ceilings so nothing — not even a tampered save — can trivial-
 * ise the game.
 */
export function computeEffects(levels: UpgradeLevels): UpgradeEffects {
  const lv = (id: UpgradeId) => levelOf(levels, id);
  return {
    sweepSpeedMult: clamp(1 - lv('steadyCable') * UPGRADE_DEFS.steadyCable.perLevel, 0.5, 1),
    perfectBandBonus: clamp(lv('wideFooting') * UPGRADE_DEFS.wideFooting.perLevel, 0, 0.12),
    windMult: clamp(1 - lv('windbreak') * UPGRADE_DEFS.windbreak.perLevel, 0.4, 1),
    rewardMult: clamp(1 + lv('masterArchitect') * UPGRADE_DEFS.masterArchitect.perLevel, 1, 2),
    extraTopple: clamp(lv('reinforcedCore') * UPGRADE_DEFS.reinforcedCore.perLevel, 0, 4),
    leanResetMult: clamp(1 + lv('quickRecovery') * UPGRADE_DEFS.quickRecovery.perLevel, 1, 2),
    heightMult: clamp(1 + lv('tailwind') * UPGRADE_DEFS.tailwind.perLevel, 1, 1.4),
    toppleReduction: clamp(lv('salvage') * UPGRADE_DEFS.salvage.perLevel, 0, 3),
    perfectBonus: clamp(lv('momentum') * UPGRADE_DEFS.momentum.perLevel, 0, 0.5),
    passiveLeanReset: clamp(1 + lv('centerMagnet') * UPGRADE_DEFS.centerMagnet.perLevel, 1, 1.75),
  };
}
