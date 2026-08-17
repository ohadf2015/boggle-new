/**
 * WordCraft Match Manager
 * Wraps pure match state logic and adds server-side timer management.
 * One instance per live game.
 */

import type { WordCraftGameState, WordCraftPlacement, WordCraftTurn } from '@/shared/types/wordcraft';
import {
  initWordCraftMatch,
  validateWordCraftMove,
  applyWordCraftMove,
  applyWordCraftPass,
  applyWordCraftTimeout,
} from '@/lib/word-craft/mp/matchState';
import type { Tile } from '@/lib/word-craft/types';

export interface WordCraftMatchInitParams {
  roomId: string;
  player1Username: string;
  player2Username: string;
  board: Tile[][];
  bag: Tile[];
  turnDeadlineMs?: number;
}

interface TimerEntry {
  timeout: NodeJS.Timeout | null;
  deadlineMs: number;
}

// Global match registry: roomId → { state, timers }
const activeMatches = new Map<
  string,
  {
    state: WordCraftGameState;
    timers: { player1: TimerEntry; player2: TimerEntry };
    onTimeout?: (roomId: string, player: WordCraftTurn) => void;
    onGameOver?: (roomId: string, state: WordCraftGameState) => void;
  }
>();

export function initializeWordCraftMatch(
  params: WordCraftMatchInitParams
): WordCraftGameState {
  const { roomId, player1Username, player2Username, board, bag, turnDeadlineMs = 60000 } = params;

  const state = initWordCraftMatch({
    player1Username,
    player2Username,
    board,
    bag,
    roomId,
  });

  state.turnDeadlineMs = turnDeadlineMs;

  const timers = {
    player1: { timeout: null, deadlineMs: 0 },
    player2: { timeout: null, deadlineMs: 0 },
  };

  activeMatches.set(roomId, {
    state,
    timers,
  });

  // Start timer for current player (player1)
  startTurnTimer(roomId, 'player1', turnDeadlineMs);

  return state;
}

export function getMatch(roomId: string):
  | {
      state: WordCraftGameState;
      timers: { player1: TimerEntry; player2: TimerEntry };
      onTimeout?: (roomId: string, player: WordCraftTurn) => void;
      onGameOver?: (roomId: string, state: WordCraftGameState) => void;
    }
  | undefined {
  return activeMatches.get(roomId);
}

export function getMatchState(roomId: string): WordCraftGameState | undefined {
  return activeMatches.get(roomId)?.state;
}

/**
 * Submit a move for validation and application.
 * Returns { valid, error?, score?, scoredWords? }
 */
export async function submitWordCraftMove(
  roomId: string,
  player: WordCraftTurn,
  placements: WordCraftPlacement[],
  rackTiles: Array<{ id: string; letter: string }>,
  validator: (positions: any[], word: string) => Promise<boolean>
) {
  const match = activeMatches.get(roomId);
  if (!match) {
    return { valid: false, error: 'MATCH_NOT_FOUND' };
  }

  const { state } = match;

  // Verify it's the correct player's turn
  if (state.turn !== player) {
    return { valid: false, error: 'NOT_YOUR_TURN' };
  }

  // Validate
  const validation = await validateWordCraftMove({
    state,
    placements,
    rackTiles,
    player,
    validator,
  });

  if (!validation.valid) {
    return validation;
  }

  // Apply move
  const newState = applyWordCraftMove(state, player, placements, validation.score || 0);
  match.state = newState;

  // Restart timer for the next player
  stopTurnTimer(roomId, newState.turn);
  startTurnTimer(roomId, newState.turn, state.turnDeadlineMs);

  return validation;
}

/**
 * Submit a pass.
 */
export function submitWordCraftPass(roomId: string, player: WordCraftTurn) {
  const match = activeMatches.get(roomId);
  if (!match) {
    return { valid: false, error: 'MATCH_NOT_FOUND' };
  }

  const { state } = match;

  if (state.turn !== player) {
    return { valid: false, error: 'NOT_YOUR_TURN' };
  }

  const newState = applyWordCraftPass(state);
  match.state = newState;

  if (newState.gameStatus === 'finished') {
    if (match.onGameOver) {
      match.onGameOver(roomId, newState);
    }
    stopAllTimers(roomId);
  } else {
    // Restart timer for next player
    stopTurnTimer(roomId, newState.turn);
    startTurnTimer(roomId, newState.turn, state.turnDeadlineMs);
  }

  return { valid: true, gameStatus: newState.gameStatus };
}

/**
 * Handle timeout for a player.
 */
export function handleWordCraftTimeout(roomId: string, player: WordCraftTurn) {
  const match = activeMatches.get(roomId);
  if (!match) {
    return;
  }

  const { state } = match;
  const newState = applyWordCraftTimeout(state, player);
  match.state = newState;

  stopAllTimers(roomId);

  if (match.onGameOver) {
    match.onGameOver(roomId, newState);
  }
}

/**
 * Start a turn timer for a player.
 */
function startTurnTimer(roomId: string, player: WordCraftTurn, deadlineMs: number) {
  const match = activeMatches.get(roomId);
  if (!match) return;

  const timerEntry = player === 'player1' ? match.timers.player1 : match.timers.player2;

  // Clear existing timer
  if (timerEntry.timeout) {
    clearTimeout(timerEntry.timeout);
  }

  timerEntry.deadlineMs = Date.now() + deadlineMs;

  timerEntry.timeout = setTimeout(() => {
    if (match.onTimeout) {
      match.onTimeout(roomId, player);
    }
    handleWordCraftTimeout(roomId, player);
  }, deadlineMs);
}

/**
 * Stop the timer for a specific player.
 */
function stopTurnTimer(roomId: string, player: WordCraftTurn) {
  const match = activeMatches.get(roomId);
  if (!match) return;

  const timerEntry = player === 'player1' ? match.timers.player1 : match.timers.player2;
  if (timerEntry.timeout) {
    clearTimeout(timerEntry.timeout);
    timerEntry.timeout = null;
  }
}

/**
 * Stop all timers and clean up match.
 */
function stopAllTimers(roomId: string) {
  const match = activeMatches.get(roomId);
  if (!match) return;

  stopTurnTimer(roomId, 'player1');
  stopTurnTimer(roomId, 'player2');
}

/**
 * End a match and clean up.
 */
export function endWordCraftMatch(roomId: string) {
  stopAllTimers(roomId);
  activeMatches.delete(roomId);
}

/**
 * Register a callback for timeout events.
 */
export function setWordCraftTimeoutHandler(
  roomId: string,
  handler: (roomId: string, player: WordCraftTurn) => void
) {
  const match = activeMatches.get(roomId);
  if (match) {
    match.onTimeout = handler;
  }
}

/**
 * Register a callback for game-over events.
 */
export function setWordCraftGameOverHandler(
  roomId: string,
  handler: (roomId: string, state: WordCraftGameState) => void
) {
  const match = activeMatches.get(roomId);
  if (match) {
    match.onGameOver = handler;
  }
}

/**
 * Get remaining time for current player's turn.
 */
export function getRemainingTurnTime(roomId: string): number {
  const state = getMatchState(roomId);
  if (!state) return 0;

  const player = state.turn;
  const match = activeMatches.get(roomId);
  if (!match) return 0;

  const timerEntry = player === 'player1' ? match.timers.player1 : match.timers.player2;
  const remaining = Math.max(0, timerEntry.deadlineMs - Date.now());
  return remaining;
}
