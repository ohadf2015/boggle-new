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

export function clampGemDramaForCosy(plan: GemDramaPlan): GemDramaPlan {
  if (plan.tier !== 'crown') return plan;
  return {
    ...plan,
    freezeFrameMs: 0,
    sharedFxPreset: 'sparkle',
  };
}
