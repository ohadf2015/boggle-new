/**
 * Archetype Mastery System
 *
 * Tracks per-archetype progression as players accumulate stars on levels
 * of each archetype type. Mastery tiers unlock permanent passive bonuses
 * that enhance future gameplay on that archetype.
 *
 * Designed to reward depth over breadth — replaying and perfecting
 * archetype-specific levels is the path to mastery.
 */

import type {
  LevelCompletion,
  LevelConfig,
  ArchetypeMasteryTier,
  ArchetypeMasteryThresholds,
  ArchetypeMasteryBonus,
  ArchetypeMasteryState,
  MasterableArchetype,
} from '@/types/adventure';
import { getArchetypeForLevel } from './levelArchetypes';

// ==============================================
// THRESHOLDS
// ==============================================

/** Star thresholds to reach each mastery tier (shared across all archetypes). */
export const ARCHETYPE_MASTERY_THRESHOLDS: ArchetypeMasteryThresholds = {
  bronze: 5,
  silver: 15,
  gold: 30,
  diamond: 50,
};

// ==============================================
// BONUSES PER ARCHETYPE × TIER
// ==============================================

type BonusMap = Record<Exclude<ArchetypeMasteryTier, 'none'>, ArchetypeMasteryBonus>;

/**
 * Each archetype grants a thematic bonus at each tier.
 * Bonuses are cumulative — gold tier gets bronze + silver + gold.
 */
export const ARCHETYPE_MASTERY_BONUSES: Record<MasterableArchetype, BonusMap> = {
  classic: {
    bronze:  { description: '+5% score on classic levels', bonusType: 'score', value: 0.05 },
    silver:  { description: '+10% score on classic levels', bonusType: 'score', value: 0.10 },
    gold:    { description: '+5s timer on classic levels', bonusType: 'timer', value: 5 },
    diamond: { description: '+20% score on classic levels', bonusType: 'score', value: 0.20 },
  },
  blast: {
    bronze:  { description: '+1 bomb tile on blast levels', bonusType: 'tiles', value: 1 },
    silver:  { description: '+2 bonus moves on blast levels', bonusType: 'objectives', value: 2 },
    gold:    { description: '+2 bomb tiles on blast levels', bonusType: 'tiles', value: 2 },
    diamond: { description: '+5 bonus moves on blast levels', bonusType: 'objectives', value: 5 },
  },
  hunt: {
    bronze:  { description: '+10 life points on hunt levels', bonusType: 'objectives', value: 10 },
    silver:  { description: '+10% score on hunt levels', bonusType: 'score', value: 0.10 },
    gold:    { description: '+20 life points on hunt levels', bonusType: 'objectives', value: 20 },
    diamond: { description: '+15% score on hunt levels', bonusType: 'score', value: 0.15 },
  },
  wheel: {
    bronze:  { description: '+5s timer on wheel levels', bonusType: 'timer', value: 5 },
    silver:  { description: '+1 gold tile on wheel levels', bonusType: 'tiles', value: 1 },
    gold:    { description: '+10s timer on wheel levels', bonusType: 'timer', value: 10 },
    diamond: { description: '+2 gold tiles on wheel levels', bonusType: 'tiles', value: 2 },
  },
  forge: {
    bronze:  { description: '+1 gold tile on forge levels', bonusType: 'tiles', value: 1 },
    silver:  { description: '+10% score on forge levels', bonusType: 'score', value: 0.10 },
    gold:    { description: '+2 gold tiles on forge levels', bonusType: 'tiles', value: 2 },
    diamond: { description: '+15s timer on forge levels', bonusType: 'timer', value: 15 },
  },
};

// ==============================================
// CORE FUNCTIONS
// ==============================================

const TIER_ORDER: ArchetypeMasteryTier[] = ['none', 'bronze', 'silver', 'gold', 'diamond'];
const TIER_KEYS: Exclude<ArchetypeMasteryTier, 'none'>[] = ['bronze', 'silver', 'gold', 'diamond'];

/** Determine mastery tier from total accumulated stars. */
export function getMasteryTier(totalStars: number): ArchetypeMasteryTier {
  const t = ARCHETYPE_MASTERY_THRESHOLDS;
  if (totalStars >= t.diamond) return 'diamond';
  if (totalStars >= t.gold) return 'gold';
  if (totalStars >= t.silver) return 'silver';
  if (totalStars >= t.bronze) return 'bronze';
  return 'none';
}

/**
 * Derive per-archetype mastery state from a player's completion history.
 * Boss completions are excluded (bosses have no mastery track).
 */
export function calculateArchetypeMastery(
  completions: LevelCompletion[],
): Partial<Record<MasterableArchetype, ArchetypeMasteryState>> {
  const starsByArchetype: Partial<Record<MasterableArchetype, number>> = {};

  for (const c of completions) {
    const archetype = getArchetypeForLevel(c.world, c.level);
    if (archetype === 'boss') continue;
    starsByArchetype[archetype] = (starsByArchetype[archetype] ?? 0) + c.stars;
  }

  const result: Partial<Record<MasterableArchetype, ArchetypeMasteryState>> = {};
  for (const [arch, stars] of Object.entries(starsByArchetype)) {
    result[arch as MasterableArchetype] = {
      totalStars: stars,
      tier: getMasteryTier(stars),
    };
  }

  return result;
}

/**
 * Get all cumulative bonuses for an archetype at a given tier.
 * Returns bonuses from bronze up to (and including) the current tier.
 * Returns empty array for 'none' tier.
 */
export function getMasteryBonusesForArchetype(
  archetype: MasterableArchetype,
  tier: ArchetypeMasteryTier,
): ArchetypeMasteryBonus[] {
  if (tier === 'none') return [];

  const tierIndex = TIER_ORDER.indexOf(tier);
  const bonuses: ArchetypeMasteryBonus[] = [];
  const archetypeBonuses = ARCHETYPE_MASTERY_BONUSES[archetype];

  for (const key of TIER_KEYS) {
    if (TIER_ORDER.indexOf(key) <= tierIndex) {
      bonuses.push(archetypeBonuses[key]);
    }
  }

  return bonuses;
}

/**
 * Apply archetype mastery bonuses to a level config.
 * Returns a new config with bonuses applied (does not mutate input).
 * No-ops for boss levels or when no relevant mastery exists.
 */
export function applyMasteryBonuses(
  config: LevelConfig,
  mastery: Partial<Record<MasterableArchetype, ArchetypeMasteryState>> | undefined,
): LevelConfig {
  if (!mastery || !config.archetype || config.archetype === 'boss') {
    return config;
  }

  const arch = config.archetype as MasterableArchetype;
  const state = mastery[arch];
  if (!state || state.tier === 'none') return config;

  const bonuses = getMasteryBonusesForArchetype(arch, state.tier);
  if (bonuses.length === 0) return config;

  const result = { ...config };

  for (const bonus of bonuses) {
    switch (bonus.bonusType) {
      case 'timer':
        result.timerSeconds = result.timerSeconds + bonus.value;
        break;
      // score, tiles, objectives bonuses are applied at runtime by the game reducer
      // They are read via getMasteryBonusesForArchetype directly
    }
  }

  return result;
}
