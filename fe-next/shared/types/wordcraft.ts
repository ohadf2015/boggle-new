/**
 * WordCraft Multiplayer Types
 * Server-authoritative 1v1 turn-based tile placement game
 */

import type { RackTile, PlacedTile } from '@/lib/word-craft/types';

export type WordCraftTurn = 'player1' | 'player2';

export interface WordCraftGameState {
  // Players
  player1: {
    username: string;
    rack: RackTile[];
    score: number;
  };
  player2: {
    username: string;
    rack: RackTile[];
    score: number;
  };

  // Board & bag state
  board: PlacedTile[][];
  bag: RackTile[];
  usedTiles: Set<string>;

  // Turn management
  turn: WordCraftTurn;
  consecutivePasses: number;
  gameStatus: 'in-progress' | 'finished';
  winner?: WordCraftTurn;

  // Timing
  turnStartTime: number;
  turnDeadlineMs: number;

  // Metadata
  seed?: string;
  roomId: string;
  humansOnly: boolean;
}

export interface WordCraftPlacement {
  tileId: string;
  pos: { row: number; col: number };
  letter: string;
}

export interface WordCraftMovePayload {
  placements: WordCraftPlacement[];
  rack: Array<{ id: string; letter: string }>;
}

export interface WordCraftMoveResult {
  valid: boolean;
  score?: number;
  error?: string;
  scoredWords?: string[];
}

export interface WordCraftGameOverPayload {
  winner: WordCraftTurn;
  finalScores: {
    player1: number;
    player2: number;
  };
  gameId: string;
}
