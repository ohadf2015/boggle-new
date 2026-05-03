/**
 * Cozy tutorial copy keys per practice mode.
 * Each mode gets 3 short tips written in plain calm tone (no exclamation marks,
 * no game jargon). Translation keys live under `gameModes.<mode>.tutorial.tip{1-3}`.
 */

import type { IntroMode } from '@/hooks/useModeFirstSeen';

export type PracticeMode = Exclude<IntroMode, 'blast'>;

export const TUTORIAL_TIP_COUNT = 3;

export function tutorialTipKeys(mode: PracticeMode): string[] {
  return Array.from({ length: TUTORIAL_TIP_COUNT }, (_, i) => `gameModes.${mode}.tutorial.tip${i + 1}`);
}
