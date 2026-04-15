/**
 * Adventure level types — objectives, archetype, and level configuration.
 */

import type { BossTwistType } from '../boss';
import type { SpecialTile } from './tiles';

export type ObjectiveType =
  | 'wordCount'
  | 'scoreTarget'
  | 'clearIce'
  | 'longWords'
  | 'timeBonus'
  | 'collectGems'
  // Boss-specific
  | 'defeatBoss'
  | 'surviveBattle'
  | 'mechanicTrigger'
  | 'noDamage';

export interface LevelObjective {
  type: ObjectiveType;
  target: number;
  current?: number;
  isComplete?: boolean;
  /** Primary objective is required to complete the level */
  isPrimary?: boolean;
}

/**
 * Level archetypes map to real game modes and flavor objectives / tiles / timer:
 * classic | blast | hunt | wheel | forge | boss.
 */
export type LevelArchetype =
  | 'classic'
  | 'blast'
  | 'hunt'
  | 'wheel'
  | 'forge'
  | 'boss';

export interface LevelConfig {
  world: number;
  level: number;
  gridSize: 4 | 5 | 6 | 7;
  timerSeconds: number;
  /** World 1 uses 2 for tutorials, default 3 */
  minWordLength?: 2 | 3 | 4 | 5;
  objectives: LevelObjective[];
  specialTiles: SpecialTile[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  hiddenWord?: string;
  worldMechanic?: string;
  chapterNumber: 1 | 2 | 3;
  levelInChapter: 1 | 2 | 3;
  isBossLevel: boolean;
  bossTwist?: BossTwistType;
  showBossIntro?: boolean;
  archetype?: LevelArchetype;
  /** Move limit for blast archetype (replaces timer) */
  movesLimit?: number;
  /** Hunt archetype — hidden target word */
  hasTargetWord?: boolean;
  /** Hunt archetype life points (replaces timer) */
  lifePoints?: number;
  /** Wheel archetype — mandatory center letter */
  centerLetterRequired?: boolean;
  centerLetter?: string;
  /** Forge archetype — rune pick before level */
  hasRunePick?: boolean;
  themeDisplayKey?: string;
  gameModeDisplayKey?: string;
  themedWordCount?: number;
  themedBonusMultiplier?: number;
}
