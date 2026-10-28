/**
 * Wave themes — each wave plays differently, not just looks different. A theme
 * reshapes spawn weights, moves, cascade payout, diamond rarity, coin payout and
 * the wave's goal. Pure and deterministic so SP and the MP server agree.
 */

export const BLAST_WAVE_THEME_IDS = [
  'warmUp',
  'bombSquad',
  'coinRush',
  'diamondHunt',
  'boss',
  'cascadeCarnival',
] as const;

export type BlastWaveThemeId = (typeof BLAST_WAVE_THEME_IDS)[number];

export type BlastWaveAccentToken = 'neo-lime' | 'neo-pink' | 'neo-cyan' | 'neo-purple' | 'neo-orange';

export interface BlastWaveThemeParams {
  /** Multiplies the wave's base special-tile chance */
  specialChanceMultiplier: number;
  /** Coin share of random specials (bombs take the rest) */
  goldShare: number;
  /** Added to the wave's base moves */
  movesDelta: number;
  /** Multiplies the cascade chain bonus */
  cascadeBonusMultiplier: number;
  /** Added to the wave's max cascade depth */
  maxCascadeDelta: number;
  /** Added to a word's rarity score, so lower-rarity words still earn diamonds */
  rarityBoost: number;
  /** Multiplies the coins a word pays out (SP currency) */
  coinMultiplier: number;
  /** Multiplies the wave-clear reward */
  rewardMultiplier: number;
}

export interface BlastWaveTheme {
  id: BlastWaveThemeId;
  /** 0 for waves 1-5, 1 for 6-10, ... — themes escalate with it */
  tier: number;
  nameKey: string;
  goalKey: string;
  flavorKey: string;
  accentToken: BlastWaveAccentToken;
  params: BlastWaveThemeParams;
}

const NEUTRAL: BlastWaveThemeParams = {
  specialChanceMultiplier: 1,
  goldShare: 0.5,
  movesDelta: 0,
  cascadeBonusMultiplier: 1,
  maxCascadeDelta: 0,
  rarityBoost: 0,
  coinMultiplier: 1,
  rewardMultiplier: 1,
};

const ACCENTS: Record<BlastWaveThemeId, BlastWaveAccentToken> = {
  warmUp: 'neo-lime',
  bombSquad: 'neo-orange',
  coinRush: 'neo-cyan',
  diamondHunt: 'neo-purple',
  boss: 'neo-pink',
  cascadeCarnival: 'neo-lime',
};

function paramsFor(id: BlastWaveThemeId, tier: number): BlastWaveThemeParams {
  switch (id) {
    case 'warmUp':
      return { ...NEUTRAL, movesDelta: 2 };
    case 'bombSquad':
      return { ...NEUTRAL, specialChanceMultiplier: 1.5 + 0.1 * tier, goldShare: 0.2, cascadeBonusMultiplier: 1.5 };
    case 'coinRush':
      return { ...NEUTRAL, specialChanceMultiplier: 1.3 + 0.1 * tier, goldShare: 0.85, coinMultiplier: 2 };
    case 'diamondHunt':
      return { ...NEUTRAL, movesDelta: 1, rarityBoost: 6 + tier, rewardMultiplier: 1.2 };
    case 'boss':
      return {
        ...NEUTRAL,
        specialChanceMultiplier: 1.2,
        goldShare: 0.4,
        movesDelta: -2,
        cascadeBonusMultiplier: 1.2,
        rarityBoost: 2,
        rewardMultiplier: 2 + 0.5 * tier,
      };
    case 'cascadeCarnival':
      return { ...NEUTRAL, cascadeBonusMultiplier: 2, maxCascadeDelta: 1 };
  }
}

const CYCLE: readonly BlastWaveThemeId[] = ['bombSquad', 'coinRush', 'diamondHunt', 'cascadeCarnival'];

export function getWaveTheme(wave: number): BlastWaveTheme {
  const w = Math.max(1, Math.floor(wave));
  const tier = Math.floor((w - 1) / 5);
  let id: BlastWaveThemeId;
  if (w === 1) id = 'warmUp';
  else if (w % 5 === 0) id = 'boss';
  else id = CYCLE[(w - 2 - Math.floor(w / 5)) % CYCLE.length];
  return {
    id,
    tier,
    nameKey: `blast.theme.${id}.name`,
    goalKey: `blast.theme.${id}.goal`,
    flavorKey: `blast.theme.${id}.flavor`,
    accentToken: ACCENTS[id],
    params: paramsFor(id, tier),
  };
}
