import { getGameModeRules } from '@/backend/modes/rules';
import type { GameMode } from '@/shared/types/game';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

export type RehearsalSource = 'hq' | 'class' | 'lobby';

const INTENT_KEY = 'lexiclash:rehearse-intent';
/** URL param that carries the tap's entry from the rehearse button through the launch lobby. */
export const REHEARSE_ENTRY_PARAM = 'rehearse';
// Matches the quick-launch hand-off: a failed launch must not leave bots queued for a lobby opened by hand later.
const INTENT_TTL_MS = 5 * 60 * 1000;

export const REHEARSAL_FALLBACK_MODE: GameMode = 'classic';

// The teacher's own practice seat outlives a practice run (and a game switch); it is never a student.
export function realStudentCount(students: ReadonlyArray<{ isBot?: boolean; isPractice?: boolean }>): number {
  return students.filter((s) => !s.isBot && !s.isPractice).length;
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

/** Returns the tap's entry: only a launch that carries it back may claim the intent. */
export function writeRehearseIntent(intent: RehearseIntent, now = Date.now()): string {
  const entry = `${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, at: now, entry }));
  } catch {
    /* storage blocked: the teacher still lands in the lobby and can tap practice there */
  }
  return entry;
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

/** The intent only once a launch has claimed it for this room: a host board never acts on a tap nobody launched. */
export function peekRehearseIntentForRoom(gameCode: string, now = Date.now()): RehearseIntent | null {
  const intent = peekRehearseIntent(now);
  if (!intent) return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(INTENT_KEY) ?? '{}') as { gameCode?: unknown };
    return parsed.gameCode === gameCode ? intent : null;
  } catch {
    return null;
  }
}

/**
 * Bind the intent to the room it launches. Only the launch that came from the rehearse tap
 * (same entry) claims it; any other launch, or a second room, finds an abandoned intent and clears it.
 */
export function claimRehearseIntentForLaunch(gameCode: string, entry: string | null | undefined, now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw || !peekRehearseIntent(now)) return false;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const otherRoom = typeof parsed.gameCode === 'string' && parsed.gameCode !== gameCode;
    if (!entry || parsed.entry !== entry || otherRoom) {
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
