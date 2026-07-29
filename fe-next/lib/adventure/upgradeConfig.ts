/**
 * Word Forge — Upgrade System Configuration
 *
 * Inspired by Gold Miner / Motherload progression loops.
 * Each upgrade has 2-5 tiers with tangible gameplay effects.
 * Stored as JSONB: { [upgradeId]: tierLevel }
 */

// ==============================================
// TYPES
// ==============================================

export type UpgradeCategory = 'excavation' | 'survival' | 'fortune' | 'mastery';

export interface UpgradeTier {
  /** Tier level (1-based) */
  level: number;
  /** Gold cost to purchase this tier */
  cost: number;
  /** Translation key for tier effect description */
  effectKey: string;
  /** Numeric effect value (interpretation varies by upgrade) */
  value: number;
}

export interface UpgradeDefinition {
  /** Unique upgrade identifier */
  id: string;
  /** Category for shop organization */
  category: UpgradeCategory;
  /** Translation key for upgrade name */
  nameKey: string;
  /** Translation key for upgrade description */
  descriptionKey: string;
  /** Icon filename in /images/upgrades/ */
  icon: string;
  /** Tiers from lowest to highest */
  tiers: UpgradeTier[];
  /** Minimum world number to unlock this upgrade */
  unlockWorld: number;
}

export type UpgradeState = Record<string, number>;

// ==============================================
// UPGRADE CATALOG
// ==============================================

export const UPGRADES: UpgradeDefinition[] = [
  // ─── EXCAVATION (Grid & Word Finding) ───────────

  {
    id: 'wordRadar',
    category: 'excavation',
    nameKey: 'adventure.upgrades.wordRadar.name',
    descriptionKey: 'adventure.upgrades.wordRadar.desc',
    icon: 'upgrade-word-radar.png',
    unlockWorld: 1,
    tiers: [
      { level: 1, cost: 60, effectKey: 'adventure.upgrades.wordRadar.t1', value: 0.3 },
      { level: 2, cost: 120, effectKey: 'adventure.upgrades.wordRadar.t2', value: 0.5 },
      { level: 3, cost: 200, effectKey: 'adventure.upgrades.wordRadar.t3', value: 2 },
      { level: 4, cost: 350, effectKey: 'adventure.upgrades.wordRadar.t4', value: 3 },
      { level: 5, cost: 500, effectKey: 'adventure.upgrades.wordRadar.t5', value: 5 },
    ],
  },
  {
    id: 'deepDrill',
    category: 'excavation',
    nameKey: 'adventure.upgrades.deepDrill.name',
    descriptionKey: 'adventure.upgrades.deepDrill.desc',
    icon: 'upgrade-deep-drill.png',
    unlockWorld: 3,
    tiers: [
      { level: 1, cost: 80, effectKey: 'adventure.upgrades.deepDrill.t1', value: 2 },
      { level: 2, cost: 180, effectKey: 'adventure.upgrades.deepDrill.t2', value: 1 },
      { level: 3, cost: 300, effectKey: 'adventure.upgrades.deepDrill.t3', value: 1 },
      { level: 4, cost: 500, effectKey: 'adventure.upgrades.deepDrill.t4', value: 1 },
    ],
  },
  {
    id: 'gemDetector',
    category: 'excavation',
    nameKey: 'adventure.upgrades.gemDetector.name',
    descriptionKey: 'adventure.upgrades.gemDetector.desc',
    icon: 'upgrade-gem-detector.png',
    unlockWorld: 3,
    tiers: [
      { level: 1, cost: 100, effectKey: 'adventure.upgrades.gemDetector.t1', value: 0.2 },
      { level: 2, cost: 250, effectKey: 'adventure.upgrades.gemDetector.t2', value: 1 },
      { level: 3, cost: 450, effectKey: 'adventure.upgrades.gemDetector.t3', value: 1 },
    ],
  },

  // ─── SURVIVAL (Timer & Boss Fights) ─────────────

  {
    id: 'fuelTank',
    category: 'survival',
    nameKey: 'adventure.upgrades.fuelTank.name',
    descriptionKey: 'adventure.upgrades.fuelTank.desc',
    icon: 'upgrade-fuel-tank.png',
    unlockWorld: 1,
    tiers: [
      { level: 1, cost: 50, effectKey: 'adventure.upgrades.fuelTank.t1', value: 8 },
      { level: 2, cost: 100, effectKey: 'adventure.upgrades.fuelTank.t2', value: 15 },
      { level: 3, cost: 200, effectKey: 'adventure.upgrades.fuelTank.t3', value: 20 },
      { level: 4, cost: 400, effectKey: 'adventure.upgrades.fuelTank.t4', value: 25 },
    ],
  },
  {
    id: 'armorPlating',
    category: 'survival',
    nameKey: 'adventure.upgrades.armorPlating.name',
    descriptionKey: 'adventure.upgrades.armorPlating.descGeneral',
    icon: 'upgrade-armor-plating.png',
    unlockWorld: 3,
    tiers: [
      { level: 1, cost: 60, effectKey: 'adventure.upgrades.armorPlating.t1', value: 0.1 },
      { level: 2, cost: 120, effectKey: 'adventure.upgrades.armorPlating.t2', value: 0.2 },
      { level: 3, cost: 220, effectKey: 'adventure.upgrades.armorPlating.t3', value: 0.35 },
      { level: 4, cost: 350, effectKey: 'adventure.upgrades.armorPlating.t4', value: 0.5 },
    ],
  },
  {
    id: 'blastShield',
    category: 'survival',
    nameKey: 'adventure.upgrades.blastShield.name',
    descriptionKey: 'adventure.upgrades.blastShield.desc',
    icon: 'upgrade-blast-shield.png',
    unlockWorld: 3,
    tiers: [
      { level: 1, cost: 120, effectKey: 'adventure.upgrades.blastShield.t1', value: 1 },
      { level: 2, cost: 250, effectKey: 'adventure.upgrades.blastShield.t2', value: 1 },
      { level: 3, cost: 450, effectKey: 'adventure.upgrades.blastShield.t3', value: 1 },
    ],
  },

  // ─── FORTUNE (Gold & Rewards) ───────────────────

  {
    id: 'luckyPickaxe',
    category: 'fortune',
    nameKey: 'adventure.upgrades.luckyPickaxe.name',
    descriptionKey: 'adventure.upgrades.luckyPickaxe.desc',
    icon: 'upgrade-lucky-pickaxe.png',
    unlockWorld: 1,
    tiers: [
      { level: 1, cost: 40, effectKey: 'adventure.upgrades.luckyPickaxe.t1', value: 0.1 },
      { level: 2, cost: 100, effectKey: 'adventure.upgrades.luckyPickaxe.t2', value: 0.25 },
      { level: 3, cost: 300, effectKey: 'adventure.upgrades.luckyPickaxe.t3', value: 0.5 },
      { level: 4, cost: 500, effectKey: 'adventure.upgrades.luckyPickaxe.t4', value: 0.75 },
    ],
  },
  {
    id: 'cargoBay',
    category: 'fortune',
    nameKey: 'adventure.upgrades.cargoBay.name',
    descriptionKey: 'adventure.upgrades.cargoBay.desc',
    icon: 'upgrade-cargo-bay.png',
    unlockWorld: 3,
    tiers: [
      { level: 1, cost: 90, effectKey: 'adventure.upgrades.cargoBay.t1', value: 0.3 },
      { level: 2, cost: 200, effectKey: 'adventure.upgrades.cargoBay.t2', value: 0.5 },
      { level: 3, cost: 400, effectKey: 'adventure.upgrades.cargoBay.t3', value: 1.5 },
    ],
  },
  {
    id: 'salvageClaw',
    category: 'fortune',
    nameKey: 'adventure.upgrades.salvageClaw.name',
    descriptionKey: 'adventure.upgrades.salvageClaw.desc',
    icon: 'upgrade-salvage-claw.png',
    unlockWorld: 3,
    tiers: [
      { level: 1, cost: 70, effectKey: 'adventure.upgrades.salvageClaw.t1', value: 5 },
      { level: 2, cost: 180, effectKey: 'adventure.upgrades.salvageClaw.t2', value: 0.5 },
      { level: 3, cost: 350, effectKey: 'adventure.upgrades.salvageClaw.t3', value: 1 },
    ],
  },

  // ─── MASTERY (Unlockable Abilities) ─────────────

  {
    id: 'wordDynamite',
    category: 'mastery',
    nameKey: 'adventure.upgrades.wordDynamite.name',
    descriptionKey: 'adventure.upgrades.wordDynamite.desc',
    icon: 'upgrade-word-dynamite.png',
    unlockWorld: 5,
    tiers: [
      { level: 1, cost: 150, effectKey: 'adventure.upgrades.wordDynamite.t1', value: 1 },
      { level: 2, cost: 300, effectKey: 'adventure.upgrades.wordDynamite.t2', value: 1 },
      { level: 3, cost: 500, effectKey: 'adventure.upgrades.wordDynamite.t3', value: 1 },
    ],
  },
  {
    id: 'timeFreeze',
    category: 'mastery',
    nameKey: 'adventure.upgrades.timeFreeze.name',
    descriptionKey: 'adventure.upgrades.timeFreeze.desc',
    icon: 'upgrade-time-freeze.png',
    unlockWorld: 5,
    tiers: [
      { level: 1, cost: 120, effectKey: 'adventure.upgrades.timeFreeze.t1', value: 5 },
      { level: 2, cost: 280, effectKey: 'adventure.upgrades.timeFreeze.t2', value: 10 },
    ],
  },
];

// ==============================================
// HELPERS
// ==============================================

const UPGRADE_MAP = new Map(UPGRADES.map(u => [u.id, u]));

/** Get upgrade definition by ID */
export function getUpgrade(id: string): UpgradeDefinition | undefined {
  return UPGRADE_MAP.get(id);
}

/** Get upgrades available at a given world */
export function getAvailableUpgrades(currentWorld: number): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.unlockWorld <= currentWorld);
}

/** Get upgrades by category */
export function getUpgradesByCategory(category: UpgradeCategory): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.category === category);
}

/** Get current tier level for an upgrade (0 = not purchased) */
export function getUpgradeTier(state: UpgradeState, upgradeId: string): number {
  return state?.[upgradeId] ?? 0;
}

/** Get cost to purchase next tier (null if maxed) */
export function getNextTierCost(state: UpgradeState, upgradeId: string): number | null {
  const upgrade = UPGRADE_MAP.get(upgradeId);
  if (!upgrade) return null;
  const current = getUpgradeTier(state, upgradeId);
  const nextTier = upgrade.tiers.find(t => t.level === current + 1);
  return nextTier?.cost ?? null;
}

/** Check if player can afford next tier */
export function canAffordUpgrade(state: UpgradeState, upgradeId: string, gold: number): boolean {
  const cost = getNextTierCost(state, upgradeId);
  return cost !== null && gold >= cost;
}

/** Purchase an upgrade tier. Returns new state and remaining gold, or null if can't afford */
export function purchaseUpgrade(
  state: UpgradeState,
  upgradeId: string,
  gold: number
): { state: UpgradeState; gold: number } | null {
  const cost = getNextTierCost(state, upgradeId);
  if (cost === null || gold < cost) return null;
  const current = getUpgradeTier(state, upgradeId);
  return {
    state: { ...state, [upgradeId]: current + 1 },
    gold: gold - cost,
  };
}

/** Get total gold needed to max all upgrades */
export function getTotalUpgradeCost(): number {
  return UPGRADES.reduce((sum, u) => sum + u.tiers.reduce((s, t) => s + t.cost, 0), 0);
}

/** Get active effect value for an upgrade at its current tier */
export function getUpgradeEffect(state: UpgradeState, upgradeId: string): number {
  const upgrade = UPGRADE_MAP.get(upgradeId);
  if (!upgrade) return 0;
  const tier = getUpgradeTier(state, upgradeId);
  if (tier === 0) return 0;
  const tierDef = upgrade.tiers.find(t => t.level === tier);
  return tierDef?.value ?? 0;
}

// ==============================================
// CATEGORY METADATA
// ==============================================

export const UPGRADE_CATEGORIES: {
  id: UpgradeCategory;
  nameKey: string;
  icon: string;
}[] = [
  { id: 'excavation', nameKey: 'adventure.upgrades.category.excavation', icon: '⛏️' },
  { id: 'survival', nameKey: 'adventure.upgrades.category.survival', icon: '🛡️' },
  { id: 'fortune', nameKey: 'adventure.upgrades.category.fortune', icon: '💰' },
  { id: 'mastery', nameKey: 'adventure.upgrades.category.mastery', icon: '🔮' },
];
