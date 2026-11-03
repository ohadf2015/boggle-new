export type PerkRarity = 'common' | 'rare' | 'epic';

export type PerkId =
  | 'wideLoad'
  | 'steadyHands'
  | 'longWordBonus'
  | 'perfectStreak'
  | 'goldRush'
  | 'slowSwing'
  | 'safetyNet'
  | 'luckyCrates'
  | 'magnetBase'
  | 'momentum';

export interface PerkMods {
  widthMul: number;
  swingSpeedMul: number;
  perfectWindowMul: number;
  perfectBonusMul: number;
  wordLenBonusPerLetter: number;
  comboGainMul: number;
  crateChanceMul: number;
  goldChanceMul: number;
  freeRecoveries: number;
}

export interface Perk {
  id: PerkId;
  rarity: PerkRarity;
  glyph: string;
  mods: Partial<PerkMods>;
}

export type BlockTrait = 'plain' | 'gold' | 'feather' | 'anvil' | 'magnet' | 'lucky';

export interface NextUpSlot {
  trait: BlockTrait;
  sealed: boolean;
}

export interface RankTierDef {
  id: string;
  minM: number;
}

export interface RankState {
  tier: number;
  tierId: string;
  progress01: number;
  nextTierM: number | null;
}

export interface GhostRival {
  id: string;
  name: string;
  peakM: number;
}
