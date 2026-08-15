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
      // Practice always funnels into MULTIPLAYER — never single-player mode.
      // Classic practice used to point at `/singleplayer`, which contradicted
      // the product rule "practice graduates players into multiplayer, not solo
      // play". The Arena (/multiplayer) is the real-game destination.
      return `/${locale}/multiplayer`;
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

/**
 * Where a results CTA should send the player after they finish the given mode.
 *
 * This is the anti-bounce "what's next?" hook on the daily results screens
 * (PracticeChainCta, rendered by WordWheelResults and DailyWordHuntResults). It
 * used to point at `/practice/<mode>`, which since the practice retirement only
 * exists as a 301 — the player reached a real game, but via a needless redirect
 * hop, behind a button still labelled as practice. It now links the real mode
 * directly, through the same helper the rest of the app uses.
 *
 * The chain-complete case lands on the home hub, because the practice hub it
 * used to land on is gone.
 */
export function nextPracticeUrl(current: PracticeMode, locale: string): string {
  const next = getNextPracticeMode(current);
  return next ? practiceTargetUrl(next, locale) : `/${locale}`;
}
