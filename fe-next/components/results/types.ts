import type { Avatar as AvatarType } from '@/types';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

export interface WordObject {
  word: string;
  score: number;
  validated: boolean;
  isDuplicate: boolean;
  comboBonus?: number;
  isAiVerified?: boolean;
  isPendingValidation?: boolean;
  potentialScore?: number;
  invalidReason?: string;
  aiReason?: string;
  timestamp?: number;
  timeSinceStart?: number;
  fireRoundMultiplier?: number;
  fireRoundBonus?: number;
}

export interface Title {
  icon: string;
  name: string;
  description: string;
}

export interface GameAchievement {
  icon: string;
  key?: string;
  name?: string;
  description?: string;
}

export interface Player {
  username: string;
  score: number;
  allWords?: WordObject[];
  achievements?: GameAchievement[];
  avatar?: AvatarType;
  title?: Title;
}

export interface XpGainedData {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  newLevel: number;
}

export interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

export interface ResultsPlayerCardProps {
  player: Player;
  index: number;
  allPlayerWords: Record<string, WordObject[]>;
  currentUsername?: string;
  isWinner: boolean;
  xpGainedData?: XpGainedData | null;
  levelUpData?: LevelUpData | null;
  duplicateRuleDisabled?: boolean;
  archetype?: PlayerArchetype | null;
  /** Compact mode — smaller avatar, tighter spacing, no rotation */
  compact?: boolean;
}

export interface WordChipProps {
  wordObj: WordObject;
  playerCount: number;
}
