export type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type RewardType =
  | 'coins'
  | 'tile_skin'
  | 'avatar_part'
  | 'board_theme'
  | 'title'
  | 'emote'
  | 'room_flair'
  | 'xp_boost';

export interface BattlePassReward {
  type: RewardType;
  value: string | number;
  name: string;
  rarity: RewardRarity;
}

export interface BattlePassTier {
  tier: number;
  xpRequired: number;
  freeReward: BattlePassReward | null;
  premiumReward: BattlePassReward;
}

export interface BattlePassSeasonConfig {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalTiers: number;
  premiumCost: number;
  tiers: BattlePassTier[];
}

/** Quadratic XP curve: tier^2 * 100 */
function xpForTier(tier: number): number {
  return tier * tier * 100;
}

function cumulativeXp(tier: number): number {
  let total = 0;
  for (let i = 1; i <= tier; i++) {
    total += xpForTier(i);
  }
  return total;
}

const FREE_COIN_REWARDS: Record<number, number> = {
  3: 50,
  6: 100,
  9: 150,
  12: 200,
  15: 300,
  18: 400,
  21: 500,
  24: 600,
  27: 750,
  30: 1000,
};

const PREMIUM_REWARDS: BattlePassReward[] = [
  { type: 'tile_skin', value: 'neon_glow', name: 'battlePass.reward.neonGlow', rarity: 'common' },
  { type: 'coins', value: 75, name: 'battlePass.reward.coins75', rarity: 'common' },
  { type: 'emote', value: 'fire_dance', name: 'battlePass.reward.fireDance', rarity: 'common' },
  { type: 'avatar_part', value: 'cyber_visor', name: 'battlePass.reward.cyberVisor', rarity: 'rare' },
  { type: 'coins', value: 150, name: 'battlePass.reward.coins150', rarity: 'common' },
  { type: 'tile_skin', value: 'ice_crystal', name: 'battlePass.reward.iceCrystal', rarity: 'rare' },
  { type: 'room_flair', value: 'sparkle_border', name: 'battlePass.reward.sparkleBorder', rarity: 'rare' },
  { type: 'xp_boost', value: '2x_1h', name: 'battlePass.reward.xpBoost2x', rarity: 'common' },
  { type: 'emote', value: 'lightning_bolt', name: 'battlePass.reward.lightningBolt', rarity: 'rare' },
  { type: 'board_theme', value: 'midnight', name: 'battlePass.reward.midnight', rarity: 'epic' },
  { type: 'avatar_part', value: 'flame_crown', name: 'battlePass.reward.flameCrown', rarity: 'epic' },
  { type: 'coins', value: 200, name: 'battlePass.reward.coins200', rarity: 'common' },
  { type: 'tile_skin', value: 'galaxy_swirl', name: 'battlePass.reward.galaxySwirl', rarity: 'epic' },
  { type: 'title', value: 'word_wizard', name: 'battlePass.reward.wordWizard', rarity: 'rare' },
  { type: 'room_flair', value: 'aurora_bg', name: 'battlePass.reward.auroraBg', rarity: 'epic' },
  { type: 'avatar_part', value: 'dragon_wings', name: 'battlePass.reward.dragonWings', rarity: 'epic' },
  { type: 'emote', value: 'confetti_blast', name: 'battlePass.reward.confettiBlast', rarity: 'rare' },
  { type: 'xp_boost', value: '3x_1h', name: 'battlePass.reward.xpBoost3x', rarity: 'rare' },
  { type: 'coins', value: 300, name: 'battlePass.reward.coins300', rarity: 'common' },
  { type: 'board_theme', value: 'volcano', name: 'battlePass.reward.volcano', rarity: 'epic' },
  { type: 'tile_skin', value: 'holographic', name: 'battlePass.reward.holographic', rarity: 'legendary' },
  { type: 'title', value: 'lexicon_lord', name: 'battlePass.reward.lexiconLord', rarity: 'epic' },
  { type: 'avatar_part', value: 'golden_halo', name: 'battlePass.reward.goldenHalo', rarity: 'legendary' },
  { type: 'room_flair', value: 'lightning_frame', name: 'battlePass.reward.lightningFrame', rarity: 'epic' },
  { type: 'emote', value: 'meteor_shower', name: 'battlePass.reward.meteorShower', rarity: 'epic' },
  { type: 'coins', value: 500, name: 'battlePass.reward.coins500', rarity: 'rare' },
  { type: 'xp_boost', value: '5x_1h', name: 'battlePass.reward.xpBoost5x', rarity: 'epic' },
  { type: 'board_theme', value: 'enchanted_forest', name: 'battlePass.reward.enchantedForest', rarity: 'legendary' },
  { type: 'tile_skin', value: 'diamond_facet', name: 'battlePass.reward.diamondFacet', rarity: 'legendary' },
  { type: 'title', value: 'season_champion', name: 'battlePass.reward.seasonChampion', rarity: 'legendary' },
];

function buildTiers(): BattlePassTier[] {
  const tiers: BattlePassTier[] = [];

  for (let i = 1; i <= 30; i++) {
    const freeCoins = FREE_COIN_REWARDS[i];
    const freeReward: BattlePassReward | null = freeCoins
      ? { type: 'coins', value: freeCoins, name: `battlePass.reward.coins${freeCoins}`, rarity: 'common' }
      : null;

    tiers.push({
      tier: i,
      xpRequired: cumulativeXp(i),
      freeReward,
      premiumReward: PREMIUM_REWARDS[i - 1],
    });
  }

  return tiers;
}

export const SEASON_1: BattlePassSeasonConfig = {
  id: 'season_1',
  name: 'battlePass.season1Name',
  startDate: '2026-04-01',
  endDate: '2026-06-30',
  totalTiers: 30,
  premiumCost: 999,
  tiers: buildTiers(),
};

export function getTierForXP(xp: number): number {
  const tiers = SEASON_1.tiers;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (xp >= tiers[i].xpRequired) {
      return tiers[i].tier;
    }
  }
  return 0;
}

export function getDaysRemaining(): number {
  const end = new Date(SEASON_1.endDate).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}
