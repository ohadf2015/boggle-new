import type { GemRarity } from '../gems/types';

export type GemDramaTier = 'chip' | 'shard' | 'crown';

export interface GemDramaPlan {
  tier: GemDramaTier;
  freezeFrameMs: number;
  sharedFxPreset?: 'sparkle' | 'sparkle-gold' | 'celebration';
  soundKey?: string;
  inventoryPulse: boolean;
}

const TIER_FOR_RARITY: Record<GemRarity, GemDramaTier> = {
  1: 'chip',
  2: 'shard',
  3: 'crown',
};

export function planGemDrama(gem: { rarity: GemRarity }): GemDramaPlan {
  const tier = TIER_FOR_RARITY[gem.rarity];
  switch (tier) {
    case 'chip':
      return { tier, freezeFrameMs: 0, inventoryPulse: false };
    case 'shard':
      return {
        tier,
        freezeFrameMs: 0,
        sharedFxPreset: 'sparkle',
        soundKey: 'coinCollect',
        inventoryPulse: true,
      };
    case 'crown':
      return {
        tier,
        freezeFrameMs: 250,
        sharedFxPreset: 'celebration',
        soundKey: 'achievement',
        inventoryPulse: true,
      };
  }
}

/**
 * Transmuting 3 chips→shard or 3 shards→crown is a reward moment too — the
 * same tier a board pickup of that rarity would trigger. Without this, every
 * transmute played the same flat "tierPromotion" sting regardless of whether
 * it just unlocked a crown (the biggest moment in the mode) or a minor shard.
 */
export function dramaForTransmuteResult(sourceRarity: GemRarity): GemDramaPlan {
  const nextRarity = (sourceRarity + 1) as GemRarity;
  return planGemDrama({ rarity: nextRarity });
}

export function clampGemDramaForCosy(plan: GemDramaPlan): GemDramaPlan {
  if (plan.tier !== 'crown') return plan;
  return {
    ...plan,
    freezeFrameMs: 0,
    sharedFxPreset: 'sparkle',
  };
}
