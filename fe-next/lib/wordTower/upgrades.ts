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
  | 'quickRecovery'; // faster lean recovery after a clean drop

export const UPGRADE_IDS: readonly UpgradeId[] = [
  'steadyCable',
  'wideFooting',
  'windbreak',
  'masterArchitect',
  'reinforcedCore',
  'quickRecovery',
] as const;

/**
 * The upgrades whose effects are wired into the live run today (sweep speed,
 * wind, coin reward, brink forgiveness). `wideFooting` (perfect-band widen) and
 * `quickRecovery` (lean recovery) are defined in the economy but their effects
 * await the WYSIWYG-sensitive crane-band / lean wiring, so the shop only SELLS
 * what actually does something — never a no-op purchase.
 */
export const LIVE_UPGRADE_IDS: readonly UpgradeId[] = [
  'steadyCable',
  'windbreak',
  'masterArchitect',
  'reinforcedCore',
] as const;

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
  wideFooting: { maxLevel: 4, baseCost: 220, costGrowth: 1.8, perLevel: 0.02 },
  windbreak: { maxLevel: 4, baseCost: 180, costGrowth: 1.7, perLevel: 0.12 },
  masterArchitect: { maxLevel: 5, baseCost: 200, costGrowth: 1.75, perLevel: 0.1 },
  reinforcedCore: { maxLevel: 2, baseCost: 400, costGrowth: 2.2, perLevel: 1 },
  quickRecovery: { maxLevel: 3, baseCost: 260, costGrowth: 1.8, perLevel: 0.15 },
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
}

export const NEUTRAL_EFFECTS: UpgradeEffects = {
  sweepSpeedMult: 1,
  perfectBandBonus: 0,
  windMult: 1,
  rewardMult: 1,
  extraTopple: 0,
  leanResetMult: 1,
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
  };
}
