/**
 * The quick-launch channel between the teacher dashboard and the express lobby.
 *
 * The dashboard's PLAY NOW panel resolves everything a room needs (which words,
 * what to call it, which language) BEFORE it navigates, writes it here, and
 * sends the teacher to `education/classroom-game?flow=quickLaunch`. The express
 * lobby reads it once and creates the room without asking a single question.
 *
 * Two rules this module exists to enforce:
 *  - The intent EXPIRES. It is a hand-off for the navigation that follows it,
 *    not a preference. Without a TTL a stale one written before lunch would
 *    hijack a teacher who opened the lobby by hand (pitfalls class 1: two
 *    sources for "what are we playing", one resolving late).
 *  - A blob that does not fully describe a launch reads as NO intent. Half of
 *    one would start a room with no words and no error (pitfalls class 4).
 */

import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { MIN_WORDS_PER_FOCUS } from '@/lib/education/vocabFocus';

export const QUICK_LAUNCH_KEY = 'lexiclash_teacher_quick_launch';
/** Long enough for a slow page load, far too short to survive a coffee break. */
export const QUICK_LAUNCH_TTL_MS = 5 * 60 * 1000;
/** The `?flow=` value that tells the classroom-game route to run the express path. */
export const QUICK_LAUNCH_FLOW = 'quickLaunch';
/** A pasted list past this is a mistake, and the socket payload caps at 500. */
export const MAX_PASTED_WORDS = 200;
/** Fewer than this and a board has nothing of the teacher's on it. */
export const MIN_PASTED_WORDS = 3;

export type QuickLaunchSource = 'lesson' | 'pack' | 'paste';

export interface QuickLaunchIntent {
  source: QuickLaunchSource;
  /** What the teacher will see this round called, already localised. */
  title: string;
  language: string;
  /** `source: 'lesson'` — an existing vocabulary_lessons row. */
  lessonId?: string;
  /** `source: 'pack'` — the starter pack's i18n name key, its stable id. */
  packKey?: string;
  /** `source: 'paste'` — the words themselves, parsed and deduped. */
  words?: string[];
  createdAt: number;
}

function isCompleteIntent(value: unknown): value is QuickLaunchIntent {
  if (!value || typeof value !== 'object') return false;
  const i = value as Partial<QuickLaunchIntent>;
  if (typeof i.title !== 'string' || !i.title) return false;
  if (typeof i.language !== 'string' || !i.language) return false;
  if (typeof i.createdAt !== 'number' || !Number.isFinite(i.createdAt)) return false;
  if (i.source === 'lesson') return typeof i.lessonId === 'string' && i.lessonId.length > 0;
  if (i.source === 'pack') return typeof i.packKey === 'string' && i.packKey.length > 0;
  if (i.source === 'paste') return Array.isArray(i.words) && i.words.length > 0;
  return false;
}

export function writeQuickLaunchIntent(
  intent: Omit<QuickLaunchIntent, 'createdAt'> & { createdAt?: number },
  now: number = Date.now()
): void {
  const full: QuickLaunchIntent = { ...intent, createdAt: intent.createdAt ?? now };
  try {
    sessionStorage.setItem(QUICK_LAUNCH_KEY, JSON.stringify(full));
  } catch {
    // Private mode / storage disabled. The caller still navigates; the express
    // lobby finds nothing and falls through to the full setup screen, which is
    // the correct degraded behaviour rather than a dead end.
  }
}

/** Read WITHOUT consuming — the express runner clears it explicitly once used. */
export function readQuickLaunchIntent(now: number = Date.now()): QuickLaunchIntent | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(QUICK_LAUNCH_KEY);
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
  if (!isCompleteIntent(parsed)) return null;
  if (now - parsed.createdAt > QUICK_LAUNCH_TTL_MS) return null;
  return parsed;
}

export function clearQuickLaunchIntent(): void {
  try {
    sessionStorage.removeItem(QUICK_LAUNCH_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * Split what a teacher actually pastes: a column out of a worksheet, a
 * comma list out of an email, a tab-separated cell range out of Sheets.
 */
export function parsePastedWords(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const piece of (raw || '').split(/[\n\r,;\t|]+/)) {
    const word = piece.trim();
    if (!word) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_PASTED_WORDS) break;
  }
  return out;
}

/**
 * Which mode this word list can actually carry.
 *
 * Vocab Quiz asks "which word means X" and needs definitions to ask it — a
 * pasted list of bare words gives it nothing, so those go to a Classic board
 * generated around the words instead. Pack and saved-lesson words carry
 * definitions and get the quiz, which is the mode that actually drills them.
 */
export function pickQuickLaunchMode(
  words: ReadonlyArray<{ word?: string; definition?: string | null }>
): ClassroomGameMode {
  const defined = words.filter((w) => (w.definition || '').trim().length > 0).length;
  return defined >= MIN_WORDS_PER_FOCUS ? 'vocab-quiz' : 'classic';
}
