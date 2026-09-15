/**
 * Miss-gap → Live question pack (in-product).
 *
 * Kahoot launched a free ChatGPT app (2026-09-03) that hops teachers out of
 * Kahoot to generate a quiz pack. LexiClash foil: from miss-gap results, one
 * tap writes a quickLaunch `paste` intent and opens the express classroom-game
 * lobby — the missed words become a Live pack without leaving LexiClash and
 * without a ChatGPT hop.
 *
 * Reuses quickLaunchIntent (lesson/pack/paste → Live express) and the 3-minute
 * express timer. Class-level missed words only — no student names.
 */

import {
  MAX_PASTED_WORDS,
  QUICK_LAUNCH_FLOW,
  writeQuickLaunchIntent,
  type QuickLaunchIntent,
} from '@/components/teacher/dashboard/quickLaunchIntent';
import { normalizeLocale } from './classGapShare';

/** Intent source — paste is the express path that mints a lesson from words. */
export const MISS_GAP_QUESTION_PACK_SOURCE = 'paste' as const;

export interface MissGapQuestionPackInput {
  missedWords: readonly string[];
  /** Already-localised round title the teacher will see. */
  title: string;
  language: string;
}

/**
 * Deduped, trimmed missed words capped at the paste limit.
 * Empty → null (nothing to launch).
 */
export function normalizeMissGapQuestionPackWords(
  words: readonly string[],
): string[] | null {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of words || []) {
    const word = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!word) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_PASTED_WORDS) break;
  }
  return out.length > 0 ? out : null;
}

/**
 * Build the quickLaunch intent for a miss-gap → Live question pack handoff.
 * Returns null when there are no usable missed words or no title/language.
 */
export function buildMissGapQuestionPackIntent(
  input: MissGapQuestionPackInput,
): Omit<QuickLaunchIntent, 'createdAt'> | null {
  const words = normalizeMissGapQuestionPackWords(input.missedWords);
  const title = String(input.title || '').trim();
  const language = String(input.language || '').trim();
  if (!words || !title || !language) return null;
  return {
    source: MISS_GAP_QUESTION_PACK_SOURCE,
    title,
    language,
    words,
  };
}

/** Relative express lobby path: `/{locale}/education/classroom-game?flow=quickLaunch`. */
export function missGapQuestionPackLivePath(locale: string): string {
  const loc = normalizeLocale(locale);
  return `/${loc}/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`;
}

/**
 * Stage the intent and return the path to navigate to.
 * Matches TeacherDashboard quickLaunch: write then navigate. If storage is
 * blocked the express lobby finds nothing and falls through to full setup.
 */
export function stageMissGapQuestionPackLaunch(
  input: MissGapQuestionPackInput,
  now: number = Date.now(),
): string | null {
  const intent = buildMissGapQuestionPackIntent(input);
  if (!intent) return null;
  writeQuickLaunchIntent(intent, now);
  return missGapQuestionPackLivePath(intent.language);
}
