/**
 * The docked teacher strip's height, and the padding surfaces use to clear it.
 *
 * The strip is `position: fixed` to the bottom so it survives the projector's
 * fullscreen (which targets `document.documentElement`), and publishes its own
 * height on <html> while mounted. Anything underneath reads that variable as
 * bottom padding, so the bar reserves its space instead of sitting on top of
 * the board or the leaderboard.
 *
 * This lives in its own leaf module so a consumer can read the inset without
 * importing the strip component itself, and so the two TvBroadcastView return
 * branches share ONE object rather than each spelling the var name out
 * (recurring-pitfall Class 3: asymmetric paths that should behave identically
 * but don't — here, two hand-written copies of the same string).
 */
import type { CSSProperties } from 'react';

export const TEACHER_BAR_HEIGHT_VAR = '--lc-teacher-bar-h';

/** Bottom padding that clears the docked strip; 0 when no strip is mounted. */
export const TEACHER_CONTROLS_INSET: CSSProperties = Object.freeze({
  paddingBottom: `var(${TEACHER_BAR_HEIGHT_VAR}, 0px)`,
});
