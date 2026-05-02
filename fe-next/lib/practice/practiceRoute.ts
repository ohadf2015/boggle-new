/**
 * Maps a cozy practice mode key to the real game route + practice flag.
 * Shared by the /practice/[mode] entry route and any tests.
 */

import type { IntroMode } from '@/hooks/useModeFirstSeen';

export function practiceTargetUrl(mode: IntroMode, locale: string): string {
  switch (mode) {
    case 'blast':
      return `/${locale}/blast?practice=1`;
    case 'wordHunt':
      return `/${locale}/daily/word-hunt?practice=1`;
    case 'wheelRush':
      return `/${locale}/daily/word-wheel?practice=1`;
    case 'classic':
    default:
      return `/${locale}/singleplayer?practice=1`;
  }
}

export const PRACTICE_MODES: ReadonlyArray<IntroMode> = ['classic', 'blast', 'wordHunt', 'wheelRush'];

export function isValidPracticeMode(value: string): value is IntroMode {
  return (PRACTICE_MODES as readonly string[]).includes(value);
}
