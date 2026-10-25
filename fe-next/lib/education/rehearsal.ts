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
    const parsed = JSON.parse(raw) as { source?: unknown; classExists?: unknown; at?: unknown };
    if (typeof parsed.at !== 'number' || now - parsed.at > INTENT_TTL_MS) return null;
    if (parsed.source !== 'hq' && parsed.source !== 'class') return null;
    return { source: parsed.source, classExists: parsed.classExists === true };
  } catch {
    return null;
  }
}

export function clearRehearseIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* nothing to clear */
  }
}
