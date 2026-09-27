/**
 * Blast Upgrade Catalog — pure data + math for the Blast upgrade store.
 *
 * Mirrors the Word Tower upgrade economy (cost = baseCost × growth^ownedLevel).
 * COINS buy the common upgrades (global balance via CoinContext); GEMS buy the
 * premium ones (blast-local wallet, useBlastGems). Effects are aggregated from the
 * player's owned levels and merged into a run's config at game start.
 *
 * This module is pure — no React, no store, no I/O — so the curve and effect math
 * are unit-testable in isolation and shared by the store hook + store UI.
 */

export type BlastUpgradeId = 'extraMoves' | 'luckySpawn' | 'comboSurge' | 'safetyNet';

export type BlastCurrency = 'coins' | 'gems';

export interface BlastUpgradeDef {
  id: BlastUpgradeId;
  nameKey: string;
  descKey: string;
  currency: BlastCurrency;
  /** Cost of the FIRST level. */
  baseCost: number;
  /** Geometric cost multiplier per already-owned level (>1). */
  costGrowth: number;
  /** Highest purchasable level. */
  maxLevel: number;
  /** Effect magnitude contributed per owned level (see applyPerLevel). */
  perLevel: number;
}

/** Aggregate run modifiers granted by owned upgrades. */
export interface BlastUpgradeEffects {
  /** Extra moves granted at run start. */
  startingMovesBonus: number;
  /** Added special-tile spawn chance (0-1), stacked on the wave's base. */
  luckySpawnChance: number;
  /** Multiplier applied to combo score (1 = no bonus). */
  comboScoreMult: number;
  /** Free dead-end recoveries before the run truly ends. */
  freeRecoveries: number;
}

export const NO_UPGRADE_EFFECTS: BlastUpgradeEffects = {
  startingMovesBonus: 0,
  luckySpawnChance: 0,
  comboScoreMult: 1,
  freeRecoveries: 0,
};

export const BLAST_UPGRADES: readonly BlastUpgradeDef[] = [
  {
    id: 'extraMoves',
    nameKey: 'blast.store.extraMoves.name',
    descKey: 'blast.store.extraMoves.desc',
    currency: 'coins',
    baseCost: 120,
    costGrowth: 1.8,
    maxLevel: 5,
    perLevel: 1, // +1 starting move per level
  },
  {
    id: 'luckySpawn',
    nameKey: 'blast.store.luckySpawn.name',
    descKey: 'blast.store.luckySpawn.desc',
    currency: 'coins',
    baseCost: 200,
    costGrowth: 1.9,
    maxLevel: 3,
    perLevel: 0.03, // +3% special-tile spawn chance per level
  },
  {
    id: 'comboSurge',
    nameKey: 'blast.store.comboSurge.name',
    descKey: 'blast.store.comboSurge.desc',
    currency: 'gems',
    baseCost: 8,
    costGrowth: 1.7,
    maxLevel: 3,
    perLevel: 0.25, // +25% combo score per level
  },
  {
    id: 'safetyNet',
    nameKey: 'blast.store.safetyNet.name',
    descKey: 'blast.store.safetyNet.desc',
    currency: 'gems',
    baseCost: 12,
    costGrowth: 2.0,
    maxLevel: 2,
    perLevel: 1, // +1 free dead-end recovery per level
  },
];

export function getUpgrade(id: BlastUpgradeId): BlastUpgradeDef | undefined {
  return BLAST_UPGRADES.find(u => u.id === id);
}

/** Cost to buy the NEXT level, given how many are already owned. */
export function upgradeCost(def: BlastUpgradeDef, ownedLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, Math.max(0, ownedLevel)));
}

/** Aggregate all owned upgrade levels into a single run-effect bundle. */
export function computeUpgradeEffects(levels: Partial<Record<BlastUpgradeId, number>>): BlastUpgradeEffects {
  const eff: BlastUpgradeEffects = { ...NO_UPGRADE_EFFECTS };
  for (const def of BLAST_UPGRADES) {
    const owned = Math.min(def.maxLevel, Math.max(0, Math.floor(levels[def.id] ?? 0)));
    if (owned <= 0) continue;
    const magnitude = def.perLevel * owned;
    switch (def.id) {
      case 'extraMoves': eff.startingMovesBonus += magnitude; break;
      case 'luckySpawn': eff.luckySpawnChance += magnitude; break;
      case 'comboSurge': eff.comboScoreMult += magnitude; break;
      case 'safetyNet': eff.freeRecoveries += magnitude; break;
    }
  }
  return eff;
}
