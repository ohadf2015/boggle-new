import { getGameModeRules } from '@/backend/modes/rules';
import type { GameMode } from '@/shared/types/game';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

export type RehearsalSource = 'hq' | 'class' | 'lobby';

const INTENT_KEY = 'lexiclash:rehearse-intent';
// Matches the quick-launch hand-off: a failed launch must not leave bots queued for a lobby opened by hand later.
const INTENT_TTL_MS = 5 * 60 * 1000;

export const REHEARSAL_FALLBACK_MODE: GameMode = 'classic';

export function realStudentCount(students: ReadonlyArray<{ isBot?: boolean }>): number {
  return students.filter((s) => !s.isBot).length;
}

// The quiz server enrols humans only, so a bots-only quiz has nobody answering.
export function modeAllowsRehearsalBots(mode: string | null | undefined): boolean {
  return mode !== VOCAB_QUIZ_MODE && !getGameModeRules(mode).humanOnly;
}

export interface RehearseIntent {
  source: Exclude<RehearsalSource, 'lobby'>;
  classExists: boolean;
  /** Practice run: the teacher plays as a student beside the board, so the round waits for that seat. */
  withSeat?: boolean;
}

export function writeRehearseIntent(intent: RehearseIntent, now = Date.now()): void {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, at: now }));
  } catch {
    /* storage blocked: the teacher still lands in the lobby and can tap practice there */
  }
}

export function peekRehearseIntent(now = Date.now()): RehearseIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { source?: unknown; classExists?: unknown; withSeat?: unknown; at?: unknown };
    if (typeof parsed.at !== 'number' || now - parsed.at > INTENT_TTL_MS) return null;
    if (parsed.source !== 'hq' && parsed.source !== 'class') return null;
    return { source: parsed.source, classExists: parsed.classExists === true, ...(parsed.withSeat === true ? { withSeat: true } : {}) };
  } catch {
    return null;
  }
}

/**
 * Bind the intent to the room it launches. A second launch in the same tab finds it
 * bound to another room: that intent was abandoned, so it is cleared and this room is real.
 */
export function claimRehearseIntentForLaunch(gameCode: string, now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw || !peekRehearseIntent(now)) return false;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.gameCode === 'string' && parsed.gameCode !== gameCode) {
      sessionStorage.removeItem(INTENT_KEY);
      return false;
    }
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...parsed, gameCode }));
    return true;
  } catch {
    return false;
  }
}

export function clearRehearseIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* nothing to clear */
  }
}
