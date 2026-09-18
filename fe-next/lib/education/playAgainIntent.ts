/**
 * playAgainIntent.ts
 *
 * The channel for "Play Again" between the results card and the lobby.
 *
 * After a classroom game ends, a student sees "Play Again" which should
 * re-launch the same game mode in the same classroom, without forcing them
 * back through the lobby setup. This module stores and retrieves that intent
 * exactly like quickLaunchIntent: it expires quickly (it's a hand-off, not a
 * preference), and an incomplete blob reads as NO intent.
 *
 * The difference: playAgainIntent is for STUDENTS (student next actions),
 * not teachers. Teachers already have onRematch (same room, same list).
 */

import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

export const PLAY_AGAIN_KEY = 'lexiclash_student_play_again';
/** Short TTL: this is a hand-off for the immediate next navigation. */
export const PLAY_AGAIN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PlayAgainIntent {
  /** The game mode to re-launch (classic, word-hunt, blast, etc.) */
  gameMode: ClassroomGameMode;
  /** The join code for the classroom room */
  roomCode: string;
  /** The classroom ID so we can track it */
  classroomId: string;
  /** Timestamp when this intent was created */
  createdAt: number;
}

// Valid classroom game modes for validation
const VALID_GAME_MODES: readonly ClassroomGameMode[] = [
  'classic',
  'word-hunt',
  'blast',
  'wheel-rush',
  'vocab-quiz',
  'sealed-bid',
];

export function isCompletePlayAgainIntent(value: unknown): value is PlayAgainIntent {
  if (!value || typeof value !== 'object') return false;
  const i = value as Partial<PlayAgainIntent>;

  // gameMode must be valid
  if (!('gameMode' in i) || typeof i.gameMode !== 'string') return false;
  if (!VALID_GAME_MODES.includes(i.gameMode as ClassroomGameMode)) return false;

  // roomCode must be non-empty string
  if (typeof i.roomCode !== 'string' || !i.roomCode) return false;

  // classroomId must be non-empty string
  if (typeof i.classroomId !== 'string' || !i.classroomId) return false;

  // createdAt must be a valid number
  if (typeof i.createdAt !== 'number' || !Number.isFinite(i.createdAt)) return false;

  return true;
}

export function writePlayAgainIntent(
  intent: Omit<PlayAgainIntent, 'createdAt'> & { createdAt?: number },
  now: number = Date.now()
): void {
  const full: PlayAgainIntent = { ...intent, createdAt: intent.createdAt ?? now };
  try {
    sessionStorage.setItem(PLAY_AGAIN_KEY, JSON.stringify(full));
  } catch {
    // Private mode / storage disabled. Student lands in the lobby without the
    // intent and proceeds with normal setup, which is the correct fallback.
  }
}

/**
 * Read WITHOUT consuming — the caller decides when/if to clear based on
 * whether they successfully used the intent.
 */
export function readPlayAgainIntent(now: number = Date.now()): PlayAgainIntent | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PLAY_AGAIN_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isCompletePlayAgainIntent(parsed)) return null;
  if (now - parsed.createdAt > PLAY_AGAIN_TTL_MS) return null;

  return parsed;
}

export function clearPlayAgainIntent(): void {
  try {
    sessionStorage.removeItem(PLAY_AGAIN_KEY);
  } catch {
    /* nothing to clear */
  }
}
