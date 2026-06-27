/**
 * Idle-auto-submit window (ms) for desktop click-built words, shared by modes
 * that opt into hands-free submission. A click-builder who stalls this long
 * after their last letter gets the word submitted automatically — the no-gesture
 * complement to the double-click hint below.
 *
 * Tuned higher than the practice sandbox's 1000ms: outside a teaching context a
 * player pausing to *hunt the next tile* must not trip a premature submit, so we
 * give more grace. Competitive paths (classic MP, survival) deliberately do NOT
 * wire this — there a premature partial-word submit is costly, and they rely on
 * the explicit double-click gesture instead.
 */
export const DESKTOP_IDLE_AUTOSUBMIT_MS = 1500;

/**
 * Default desktop idle-auto-submit window (ms), applied by `useGridInteraction`
 * to EVERY mode unless a caller overrides `autoSubmitIdleMs`. Once a desktop
 * player has selected enough tiles (≥3) and stops for this long, the word
 * submits automatically — no release/double-click needed. 1s is the founder-
 * requested feel: long enough not to fire mid-build, short enough to feel
 * hands-free. Touch is excluded in the hook (a paused finger must not submit).
 */
export const DEFAULT_DESKTOP_AUTOSUBMIT_MS = 1000;

/**
 * Gate for the desktop "double-click last letter to submit" hint.
 *
 * Tap-to-build (click-select) words don't submit on their own on desktop — the
 * player has to re-click/double-click the last tile. New players don't discover
 * that, so we surface a hint, but ONLY where that gesture applies:
 *  - desktop pointer (hover capable) — touch auto-submits on last-tap
 *  - actively click-selecting — irrelevant while dragging
 *  - at least 2 letters — double-click submit requires a real path
 */
export function shouldShowDoubleClickSubmitHint(args: {
  canHover: boolean;
  isClickSelecting: boolean;
  selectedCount: number;
}): boolean {
  return args.canHover && args.isClickSelecting && args.selectedCount >= 2;
}
