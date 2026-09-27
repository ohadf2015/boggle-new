/**
 * Active gameplay session state.
 */

import type { TileState } from './tiles';
import type { LevelObjective, LevelConfig } from './level';

export interface AdventureGameState {
  levelConfig: LevelConfig;
  tiles: TileState[][];
  score: number;
  wordsFound: string[];
  objectives: LevelObjective[];
  comboCount: number;
  cascadeActive: boolean;
  isComplete: boolean;
  stars: 0 | 1 | 2 | 3;

  // Power-ups
  /** 1 = normal, 2 = multiplier active */
  scoreMultiplier?: number;
  multiplierExpiresAt?: number;
  hintWord?: string;
  hintTiles?: Array<{ row: number; col: number }>;
  hintExpiresAt?: number;

  // Hunt / survival
  movesRemaining?: number;
  huntAttempts?: string[];
  huntFound?: boolean;
}
