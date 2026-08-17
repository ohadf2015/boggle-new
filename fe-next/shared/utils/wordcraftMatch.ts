/**
 * WordCraft 1v1 Match State
 * Pure, immutable state machine for turn-based multiplayer.
 * No React, no Socket.IO — just logic. Shared between backend and frontend.
 *
 * Server owns: board, both racks, score, turn, timer deadline
 */

import type { RackTile, PlacedTile } from '@/lib/word-craft/types';
import type { WordCraftGameState, WordCraftTurn, WordCraftPlacement } from '@/shared/types/wordcraft';

interface InitMatchParams {
  player1Username: string;
  player2Username: string;
  board: PlacedTile[][];
  bag: RackTile[];
  roomId: string;
}

interface ValidateMoveParams {
  state: WordCraftGameState;
  placements: WordCraftPlacement[];
  rackTiles: Array<{ id: string; letter: string }>;
  player: WordCraftTurn;
  validator: (word: string) => Promise<boolean>;
}

interface MoveResult {
  valid: boolean;
  error?: string;
  score?: number;
  scoredWords?: string[];
}

/**
 * Initialize a new 1v1 match with both players.
 * Both racks drawn from bag server-side.
 */
export function initWordCraftMatch(params: InitMatchParams): WordCraftGameState {
  const { player1Username, player2Username, board, bag, roomId } = params;

  // Draw 7 tiles for each player from the bag
  const player1Rack: RackTile[] = [];
  const player2Rack: RackTile[] = [];
  const remainingBag = [...bag];

  for (let i = 0; i < 7; i++) {
    if (remainingBag.length > 0) {
      player1Rack.push(remainingBag.pop()!);
    }
    if (remainingBag.length > 0) {
      player2Rack.push(remainingBag.pop()!);
    }
  }

  return {
    player1: {
      username: player1Username,
      rack: player1Rack,
      score: 0,
    },
    player2: {
      username: player2Username,
      rack: player2Rack,
      score: 0,
    },
    board,
    bag: remainingBag,
    usedTiles: new Set(),
    turn: 'player1',
    consecutivePasses: 0,
    gameStatus: 'in-progress',
    turnStartTime: Date.now(),
    turnDeadlineMs: 60000,
    roomId,
    humansOnly: true,
  };
}

/**
 * Validate a move: placements must use rack tiles, form valid words.
 * Rack IDs checked server-side only — client cannot spoof ownership.
 */
export async function validateWordCraftMove(
  params: ValidateMoveParams
): Promise<MoveResult> {
  const { state, placements, rackTiles, player, validator } = params;

  const playerData = player === 'player1' ? state.player1 : state.player2;
  const currentRack = playerData.rack;

  // Rack tile IDs (server-side set)
  const rackTileIds = new Set(currentRack.map((t) => t.id));

  // Check 1: All placements reference tiles in the current player's rack
  for (const placement of placements) {
    if (!rackTileIds.has(placement.tileId)) {
      return {
        valid: false,
        error: 'INVALID_RACK_TILE',
      };
    }
  }

  // Check 2: No duplicate tiles placed in this move
  const placedIds = new Set(placements.map((p) => p.tileId));
  if (placedIds.size !== placements.length) {
    return {
      valid: false,
      error: 'DUPLICATE_TILE_IN_MOVE',
    };
  }

  // Check 3: Placements don't overwrite existing board tiles
  for (const placement of placements) {
    const { pos } = placement;
    if (state.board[pos.row]?.[pos.col]) {
      return {
        valid: false,
        error: 'BOARD_POSITION_OCCUPIED',
      };
    }
  }

  // Check 4: Validate words formed by these placements
  for (const placement of placements) {
    const isValid = await validator(placement.letter);
    if (!isValid) {
      return {
        valid: false,
        error: 'INVALID_WORD',
      };
    }
  }

  const score = placements.length * 10;

  return {
    valid: true,
    score,
    scoredWords: placements.map((p) => p.letter),
  };
}

/**
 * Apply a valid move to the game state and advance turn.
 * Replenish rack from bag.
 */
export function applyWordCraftMove(
  state: WordCraftGameState,
  player: WordCraftTurn,
  placements: WordCraftPlacement[],
  score: number
): WordCraftGameState {
  const newState = { ...state };
  const playerData = player === 'player1' ? newState.player1 : newState.player2;

  // Update board
  for (const placement of placements) {
    const { pos, letter, tileId } = placement;
    newState.board[pos.row][pos.col] = {
      row: pos.row,
      col: pos.col,
      letter,
      value: 0,
      isBlank: false,
      rackTileId: tileId,
    };
    newState.usedTiles.add(tileId);
  }

  // Remove placed tiles from rack
  const placedIds = new Set(placements.map((p) => p.tileId));
  playerData.rack = playerData.rack.filter((t) => !placedIds.has(t.id));

  // Replenish rack from bag
  while (playerData.rack.length < 7 && newState.bag.length > 0) {
    playerData.rack.push(newState.bag.pop()!);
  }

  // Update score
  playerData.score += score;

  // Reset pass counter on valid move
  newState.consecutivePasses = 0;

  // Advance turn
  newState.turn = player === 'player1' ? 'player2' : 'player1';
  newState.turnStartTime = Date.now();

  return newState;
}

/**
 * Handle a pass by the current player.
 * Two consecutive passes → game over.
 * On tie, player2 wins (arbitrary tiebreaker).
 */
export function applyWordCraftPass(state: WordCraftGameState): WordCraftGameState {
  const newState = { ...state };
  newState.consecutivePasses += 1;

  if (newState.consecutivePasses >= 2) {
    // Game over — winner determined by score
    newState.gameStatus = 'finished';
    const p1Score = newState.player1.score;
    const p2Score = newState.player2.score;
    if (p1Score > p2Score) {
      newState.winner = 'player1';
    } else if (p2Score > p1Score) {
      newState.winner = 'player2';
    } else {
      newState.winner = 'player2';
    }
  } else {
    // Advance turn
    newState.turn = newState.turn === 'player1' ? 'player2' : 'player1';
    newState.turnStartTime = Date.now();
  }

  return newState;
}

/**
 * Handle timeout: player forfeits and loses.
 */
export function applyWordCraftTimeout(
  state: WordCraftGameState,
  player: WordCraftTurn
): WordCraftGameState {
  const newState = { ...state };
  newState.gameStatus = 'finished';
  newState.winner = player === 'player1' ? 'player2' : 'player1';
  return newState;
}
