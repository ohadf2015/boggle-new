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
