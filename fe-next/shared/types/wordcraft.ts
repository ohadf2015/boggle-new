/**
 * WordCraft Multiplayer Types
 * Server-authoritative 1v1 turn-based tile placement game
 */

import type { RackTile, PlacedTile } from '@/lib/word-craft/types';

export type WordCraftTurn = 'player1' | 'player2';

export interface WordCraftGameState {
  // Server truth. Both racks are always real tiles here — this state never
  // leaves the server as-is; each socket gets a WordCraftStatePayload built for
  // it. (These fields were once typed `RackTile[] | number` so the same object
  // could double as the wire format, which cost 22 type errors and forced
  // `typeof x === 'number'` guards all over the client.)
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
  board: (PlacedTile | null)[][];
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

/**
 * What one socket actually receives. Split by viewer instead of by seat: you get
 * your own tiles, the opponent only ever a count, so the bag can't leak and the
 * client needs no seat branching to read its own rack.
 */
export interface WordCraftStatePayload {
  board: (PlacedTile | null)[][];
  you: {
    seat: WordCraftTurn;
    username: string;
    score: number;
    rack: RackTile[];
  };
  opponent: {
    username: string;
    score: number;
    rackCount: number;
  };
  turn: WordCraftTurn;
  isYourTurn: boolean;
  gameStatus: 'in-progress' | 'finished';
  winner?: WordCraftTurn;
  remainingTime: number;
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
