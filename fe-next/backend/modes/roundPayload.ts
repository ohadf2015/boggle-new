/**
 * THE startGame-shaped payload, for every way a client enters a round:
 *
 *   start     — the room-wide fresh start broadcast
 *   retry     — the coordinator re-sending the start to a slow client
 *   reconnect — the `join` re-emit of a returning player (also the countdown
 *               catch-up for a player who never reported countdownComplete)
 *   lateJoin  — a new player seated mid-round
 *   recovery  — the client watchdog's `requestGameState`
 *
 * These used to be five hand-built objects in four files, and they drifted
 * (pitfall class 3): recovery handed Blast players the template board and no
 * found words; retries dropped classroom fields. One builder, one shape.
 */

import type { GameState } from '../modules/gameState/types';
import { getLeaderboard } from '../modules/gameStateManager';
import { quizShellStartFor } from '../services/vocabQuizShell';
import { getGameModeModule } from './index';

export type RoundPayloadKind = 'start' | 'retry' | 'reconnect' | 'lateJoin' | 'recovery';

export interface RoundPayloadOptions {
  kind: RoundPayloadKind;
  /** Receiving player (null for the room-wide start broadcast). */
  username?: string | null;
  /** Defaults to `<kind>-<timestamp>` for mid-round kinds. */
  messageId?: string;
  /** Round-scoped extras captured once at start (classroom accessibility, teams…). */
  extras?: Record<string, unknown>;
}

const RESUME_KINDS: ReadonlySet<RoundPayloadKind> = new Set(['reconnect', 'lateJoin', 'recovery']);

export function buildRoundPayload(gameCode: string, game: GameState, opts: RoundPayloadOptions): Record<string, unknown> {
  const { kind, username = null, extras } = opts;
  const resume = RESUME_KINDS.has(kind);
  const gameMode = game.gameMode || 'classic';
  const remaining = game.remainingTime ?? game.timerSeconds;

  const payload: Record<string, unknown> = {
    letterGrid: game.letterGrid,
    timerSeconds: resume ? remaining : game.timerSeconds,
    language: game.language,
    minWordLength: game.minWordLength || 2,
    messageId: opts.messageId ?? `${kind}-${Date.now()}`,
    gameSessionId: game.gameSessionId,
    boardTheme: game.boardTheme || null,
    gameMode,
    ...getGameModeModule(gameMode).payloadFields?.(game, { username, resume }),
  };

  // A fresh start always carries goldenLetters (even []) so the client can tell
  // "no goldens this round" apart; mid-round entries add it only when populated
  // and the client treats an omitted field as "don't touch".
  if (!resume) payload.goldenLetters = game.goldenLetters ?? [];
  else if (game.goldenLetters?.length) payload.goldenLetters = game.goldenLetters;

  if (kind === 'retry') payload.retry = true;

  if (resume) {
    payload[kind === 'lateJoin' ? 'lateJoin' : 'reconnect'] = true;
    payload.skipAck = true;
    // Teacher pause: land the returning student ON the pause.
    payload.isPaused = !!game.isPaused;
    payload.remainingTime = remaining;
    // The player's own words, so the word panel isn't blank after re-entry.
    payload.myFoundWords = (username && game.playerWords?.[username]) || [];
    // The authoritative leaderboard INSIDE startGame, so the score restores in
    // the same batched setState as the board — robust if the separate
    // updateLeaderboard is dropped or raced.
    payload.leaderboard = getLeaderboard(gameCode);
    // A running Vocab Quiz has no room grid — ride the quiz's own shell start.
    Object.assign(payload, quizShellStartFor(gameCode));
  }

  if (extras) Object.assign(payload, extras);
  return payload;
}
