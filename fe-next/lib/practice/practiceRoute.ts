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
