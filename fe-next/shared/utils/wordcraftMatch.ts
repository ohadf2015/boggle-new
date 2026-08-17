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
  board: (PlacedTile | null)[][];
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

  // Check 4: the placements must form ONE line, and the run they complete —
  // including any board tiles they butt against — has to be a real word.
  //
  // This previously called `validator(placement.letter)` once per tile, i.e. it
  // asked the dictionary whether "E" was a word. No move could ever be accepted:
  // a live two-client match rejected EAR with INVALID_WORD.
  const rows = new Set(placements.map((p) => p.pos.row));
  const cols = new Set(placements.map((p) => p.pos.col));
  const across = rows.size === 1;
  const down = cols.size === 1;
  if (!across && !down) {
    return { valid: false, error: 'INVALID_PLACEMENT' };
  }

  const size = state.board.length;
  const letterAt = (row: number, col: number): string | null => {
    if (row < 0 || col < 0 || row >= size || col >= size) return null;
    const pending = placements.find((p) => p.pos.row === row && p.pos.col === col);
    if (pending) return pending.letter;
    const existing = state.board[row]?.[col];
    return existing ? existing.letter : null;
  };
  const valueAt = (row: number, col: number): number => {
    const pending = placements.find((p) => p.pos.row === row && p.pos.col === col);
    if (pending) {
      const rackTile = currentRack.find((t) => t.id === pending.tileId);
      return rackTile?.value ?? 0;
    }
    return state.board[row]?.[col]?.value ?? 0;
  };

  // Walk back to the start of the run, then forward to its end.
  const first = placements.reduce((a, b) =>
    across ? (a.pos.col <= b.pos.col ? a : b) : (a.pos.row <= b.pos.row ? a : b),
  );
  let r = first.pos.row;
  let c = first.pos.col;
  for (;;) {
    const pr = across ? r : r - 1;
    const pc = across ? c - 1 : c;
    if (letterAt(pr, pc) === null) break;
    r = pr;
    c = pc;
  }

  const letters: string[] = [];
  const covered = new Set<string>();
  let score = 0;
  while (letterAt(r, c) !== null) {
    letters.push(letterAt(r, c) as string);
    score += valueAt(r, c);
    covered.add(`${r},${c}`);
    if (across) c += 1;
    else r += 1;
  }

  // Every placed tile must sit inside that one run — otherwise the player left a
  // gap, and the walk above stopped before reaching the stragglers.
  for (const placement of placements) {
    if (!covered.has(`${placement.pos.row},${placement.pos.col}`)) {
      return { valid: false, error: 'INVALID_PLACEMENT' };
    }
  }

  const word = letters.join('');
  if (word.length < 2) {
    return { valid: false, error: 'WORD_TOO_SHORT' };
  }

  if (!(await validator(word))) {
    return { valid: false, error: 'INVALID_WORD' };
  }

  // ponytail: sums tile values only — premium squares and the perpendicular
  // words a placement can also form are not scored yet. Upgrade when MP shares
  // the solo scorer in lib/word-craft/scoring.ts.
  return {
    valid: true,
    score,
    scoredWords: [word],
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
