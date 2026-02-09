import type { Language } from '@/shared/types/game';

// ==================== Tile Types ====================

/** Simplified tile types (from Adventure's 9 → 4) */
export type BlastTileType = 'standard' | 'gold' | 'bomb' | 'rainbow';

/** Per-cell state tracked alongside the LetterGrid */
export interface BlastTileState {
  row: number;
  col: number;
  type: BlastTileType;
  isCleared: boolean;
  /** Effect triggered when this tile is cleared (for animation) */
  activationEffect: string | null;
}

// ==================== Game State ====================

export interface BlastGameConfig {
  /** Grid size (rows/cols) — always square */
  gridSize: number;
  /** Chance of a cell being special (0-1) */
  specialTileChance: number;
  /** Game language */
  language: Language;
}

export const DEFAULT_BLAST_CONFIG: BlastGameConfig = {
  gridSize: 4,
  specialTileChance: 0.15,
  language: 'en',
};

export type BlastPhase = 'playing' | 'results';

export interface BlastGameState {
  score: number;
  wordsFound: string[];
  tilesCleared: number;
  totalTiles: number;
  comboCount: number;
  isComplete: boolean;
  /** True when no more valid words can be formed from uncleared tiles */
  isDeadEnd: boolean;
}

// ==================== Results ====================

export interface BlastResultsData {
  finalScore: number;
  tilesCleared: number;
  totalTiles: number;
  clearPercentage: number;
  wordsFound: string[];
  bestWord: string;
  maxCombo: number;
  /** 1-3 stars based on clear percentage */
  stars: 1 | 2 | 3;
}

// ==================== Special Tile Effects ====================

/** Score multiplier for gold tiles */
export const GOLD_MULTIPLIER = 3;
/** Number of adjacent cells a bomb clears */
export const BOMB_RADIUS = 1; // 3x3 area (8 adjacent cells)
/** Bonus score for rainbow tiles */
export const RAINBOW_BONUS = 5;

/** Distribution of special tiles (must sum to 1.0) */
export const SPECIAL_TILE_DISTRIBUTION: Record<Exclude<BlastTileType, 'standard'>, number> = {
  gold: 0.33,
  bomb: 0.34,
  rainbow: 0.33,
};

// ==================== Animation Events ====================

export interface BlastExplosion {
  id: string;
  row: number;
  col: number;
  type: 'word' | 'bomb' | 'clear';
  intensity: 1 | 2 | 3 | 4;
  timestamp: number;
}

export interface BlastScorePopup {
  id: string;
  score: number;
  position: { x: number; y: number };
  isSpecial: boolean;
  timestamp: number;
}
