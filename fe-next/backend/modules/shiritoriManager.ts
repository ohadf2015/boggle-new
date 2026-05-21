/**
 * Shiritori (しりとり) room state machine — turn order, used-word set, chain +
 * dictionary validation, ん-loss, and elimination → winner. Pure logic with the
 * dictionary check injected, so it unit-tests without the trie (mirrors
 * wheelRushManager). Socket glue + timeout wiring live in the handler (Phase 3).
 * Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import { shiritoriHead, shiritoriTail, endsInN } from '@/shared/utils/shiritori';
import { SHIRITORI_TURN_MS, SHIRITORI_MIN_WORD_LEN } from '@/shared/constants/shiritoriConstants';

export interface ShiritoriState {
  players: string[];
  turnIndex: number;
  chain: string[];
  used: string[];
  requiredHead: string | null;
  startedAt: number;
  turnDeadline: number;
  eliminated: Record<string, boolean>;
  finished: boolean;
  winner: string | null;
}

export type ShiritoriError = 'too-short' | 'already-used' | 'bad-chain' | 'not-a-word';
export interface ShiritoriValidation {
  valid: boolean;
  error?: ShiritoriError;
  /** Valid + chains correctly, but ends in ん → the submitting player loses. */
  endsGame?: boolean;
}

export function initShiritoriState(
  players: string[],
  now: number = Date.now(),
  turnMs: number = SHIRITORI_TURN_MS,
): ShiritoriState {
  const eliminated: Record<string, boolean> = {};
  for (const p of players) eliminated[p] = false;
  return {
    players: [...players],
    turnIndex: 0,
    chain: [],
    used: [],
    requiredHead: null,
    startedAt: now,
    turnDeadline: now + turnMs,
    eliminated,
    finished: false,
    winner: null,
  };
}

export function currentPlayer(state: ShiritoriState): string | null {
  if (state.finished) return null;
  return state.players[state.turnIndex] ?? null;
}

/**
 * Validate a candidate word against the current chain state. Order matters:
 * length → dedupe → chain → dictionary → ん-fatality (a ん word is otherwise
 * legal but loses the round for whoever plays it).
 */
export function validateShiritoriWord(
  state: ShiritoriState,
  word: string,
  isWord: (w: string) => boolean,
): ShiritoriValidation {
  const w = word.trim();
  if ([...w].length < SHIRITORI_MIN_WORD_LEN) return { valid: false, error: 'too-short' };
  if (state.used.includes(w)) return { valid: false, error: 'already-used' };
  if (state.requiredHead !== null && shiritoriHead(w) !== state.requiredHead) {
    return { valid: false, error: 'bad-chain' };
  }
  if (!isWord(w)) return { valid: false, error: 'not-a-word' };
  if (endsInN(w)) return { valid: true, endsGame: true };
  return { valid: true };
}

/** Advance the turn to the next non-eliminated player and reset the deadline. */
function advanceTurn(
  state: ShiritoriState,
  now: number,
  turnMs: number,
): ShiritoriState {
  const n = state.players.length;
  let idx = state.turnIndex;
  for (let step = 1; step <= n; step++) {
    const cand = (state.turnIndex + step) % n;
    if (!state.eliminated[state.players[cand]]) {
      idx = cand;
      break;
    }
  }
  return { ...state, turnIndex: idx, turnDeadline: now + turnMs };
}

/**
 * Record a (pre-validated) word: append to chain, set the next required head to
 * its tail, mark it used, and pass the turn. Does NOT handle ん-loss — the caller
 * applies the word for history, then calls `eliminate` for the ん/timeout case.
 */
export function applyShiritoriWord(
  state: ShiritoriState,
  word: string,
  now: number = Date.now(),
  turnMs: number = SHIRITORI_TURN_MS,
): ShiritoriState {
  const w = word.trim();
  const recorded: ShiritoriState = {
    ...state,
    chain: [...state.chain, w],
    used: [...state.used, w],
    requiredHead: shiritoriTail(w),
  };
  return advanceTurn(recorded, now, turnMs);
}

/**
 * Eliminate a player (ん-ending word or turn timeout). If one player remains the
 * game finishes with them as winner; otherwise, if the eliminated player held the
 * turn, advance to the next alive player.
 */
export function eliminate(
  state: ShiritoriState,
  player: string,
  now: number = Date.now(),
  turnMs: number = SHIRITORI_TURN_MS,
): ShiritoriState {
  const eliminated = { ...state.eliminated, [player]: true };
  const alive = state.players.filter((p) => !eliminated[p]);
  if (alive.length <= 1) {
    return { ...state, eliminated, finished: true, winner: alive[0] ?? null };
  }
  const next: ShiritoriState = { ...state, eliminated };
  if (state.players[state.turnIndex] === player) {
    return advanceTurn(next, now, turnMs);
  }
  return next;
}
