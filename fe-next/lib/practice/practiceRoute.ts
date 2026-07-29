/**
 * Maps a cozy practice mode key to the real game route + practice flag.
 * Shared by the /practice/[mode] entry route and any tests.
 */

import type { PracticeMode } from './practiceTutorialSteps';

export function practiceTargetUrl(mode: PracticeMode, locale: string): string {
  switch (mode) {
    case 'wordHunt':
      return `/${locale}/daily/word-hunt?practice=1`;
    case 'wheelRush':
      return `/${locale}/daily/word-wheel?practice=1`;
    case 'classic':
    default:
      return `/${locale}/singleplayer?practice=1`;
  }
}

/**
 * Practice mode catalog — intentionally excludes 'blast'.
 * Blast mechanics (combos, special tiles, cascade) need a bespoke tutorial
 * that doesn't fit the simple drag-find-word pattern of the other 3 modes.
 */
export const PRACTICE_MODES: ReadonlyArray<PracticeMode> = ['classic', 'wordHunt', 'wheelRush'];

export function isValidPracticeMode(value: string): value is PracticeMode {
  return (PRACTICE_MODES as readonly string[]).includes(value);
}

/**
 * Returns the next mode in the practice playlist, or null when the chain is complete.
 * Order is the array order of `PRACTICE_MODES` — keep it intentional (easiest → hardest).
 */
export function getNextPracticeMode(current: PracticeMode): PracticeMode | null {
  const idx = PRACTICE_MODES.indexOf(current);
  if (idx === -1 || idx >= PRACTICE_MODES.length - 1) return null;
  return PRACTICE_MODES[idx + 1];
}

export function practiceHubUrl(locale: string): string {
  return `/${locale}/practice`;
}

/**
 * Where a results CTA should send the player after they finish the given practice mode.
 * Falls back to the practice hub when the chain is complete (acts as a "what's next?" landing).
 */
export function nextPracticeUrl(current: PracticeMode, locale: string): string {
  const next = getNextPracticeMode(current);
  return next ? `/${locale}/practice/${next}` : practiceHubUrl(locale);
}
