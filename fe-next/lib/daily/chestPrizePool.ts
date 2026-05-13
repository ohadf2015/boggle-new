import type { ChestTier } from './weeklyChest'

export interface ChestPrize {
  variantId: string
  coins: number
  freezes: number
  badgeId: string
  labelKey: string
}

// 3 variants per tier so two cycles in a row don't feel like a carbon copy.
// Coin amounts overlap intentionally: a "shield" variant pays fewer coins but
// adds a streak freeze, while a "bonanza" variant pays more coins with no
// freeze. Average per tier stays ~the same as the old flat reward.
export const CHEST_PRIZE_POOL: Record<ChestTier, ChestPrize[]> = {
  bronze: [
    {
      variantId: 'bronze-coins',
      coins: 150,
      freezes: 0,
      badgeId: 'badge_weekly_bronze',
      labelKey: 'daily.weeklyChest.prize.coinPouch',
    },
    {
      variantId: 'bronze-shield',
      coins: 100,
      freezes: 1,
      badgeId: 'badge_weekly_bronze',
      labelKey: 'daily.weeklyChest.prize.shieldStash',
    },
    {
      variantId: 'bronze-lucky',
      coins: 200,
      freezes: 0,
      badgeId: 'badge_weekly_bronze',
      labelKey: 'daily.weeklyChest.prize.luckyHaul',
    },
  ],
  silver: [
    {
      variantId: 'silver-coins',
      coins: 300,
      freezes: 0,
      badgeId: 'badge_weekly_silver',
      labelKey: 'daily.weeklyChest.prize.coinChest',
    },
    {
      variantId: 'silver-shield',
      coins: 250,
      freezes: 1,
      badgeId: 'badge_weekly_silver',
      labelKey: 'daily.weeklyChest.prize.guardianPack',
    },
    {
      variantId: 'silver-bonanza',
      coins: 400,
      freezes: 0,
      badgeId: 'badge_weekly_silver',
      labelKey: 'daily.weeklyChest.prize.silverBonanza',
    },
  ],
  gold: [
    {
      variantId: 'gold-coins',
      coins: 600,
      freezes: 0,
      badgeId: 'badge_weekly_gold',
      labelKey: 'daily.weeklyChest.prize.dragonHoard',
    },
    {
      variantId: 'gold-fortress',
      coins: 500,
      freezes: 2,
      badgeId: 'badge_weekly_gold',
      labelKey: 'daily.weeklyChest.prize.fortressVault',
    },
    {
      variantId: 'gold-jackpot',
      coins: 800,
      freezes: 1,
      badgeId: 'badge_weekly_gold',
      labelKey: 'daily.weeklyChest.prize.crownJackpot',
    },
  ],
}

// djb2-ish hash so identical seeds always pick the same prize — important so
// a player who retries the claim endpoint (network blip) doesn't get to reroll.
function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function selectChestPrize(tier: ChestTier, seed: string): ChestPrize {
  const pool = CHEST_PRIZE_POOL[tier]
  if (!seed) return pool[0]
  return pool[hashSeed(seed) % pool.length]
}
