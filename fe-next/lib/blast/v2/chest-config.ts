export type ChestTier = {
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  coinBase: number;
  coinVariance: number;
  boostCount: number;
  avatarPartChance: number;
  frame: string;
};

const TIERS: Record<ChestTier['tier'], ChestTier> = {
  wood: {
    tier: 'wood',
    coinBase: 200,
    coinVariance: 50,
    boostCount: 0,
    avatarPartChance: 0,
    frame: 'wood',
  },
  silver: {
    tier: 'silver',
    coinBase: 400,
    coinVariance: 100,
    boostCount: 1,
    avatarPartChance: 0.12,
    frame: 'silver',
  },
  gold: {
    tier: 'gold',
    coinBase: 800,
    coinVariance: 200,
    boostCount: 2,
    avatarPartChance: 0.25,
    frame: 'gold',
  },
  legendary: {
    tier: 'legendary',
    coinBase: 2000,
    coinVariance: 500,
    boostCount: 3,
    avatarPartChance: 0.5,
    frame: 'legendary',
  },
};

export const CHEST_TIERS = TIERS;

export function tierForChestNumber(n: number): ChestTier {
  const cycleLen = 20; // chests 1-20 = pattern, then repeat
  const inCycle = ((n - 1) % cycleLen) + 1;
  let tierId: ChestTier['tier'];

  if (inCycle % 10 === 0) tierId = 'legendary'; // 10, 20 → legendary
  else if (inCycle % 5 === 0) tierId = 'gold'; // 5, 15 → gold
  else if (inCycle % 2 === 0) tierId = 'silver'; // 2,4,6,8,12,14,16,18 → silver
  else tierId = 'wood'; // 1,3,7,9,11,13,17,19 → wood

  return TIERS[tierId]!;
}
