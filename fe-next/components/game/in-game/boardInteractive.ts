/**
 * Single source of truth for "can the local player act on the board right now".
 *
 * Shared by tile tap/drag (GridComponent `interactive`) AND physical keyboard
 * typing (useKeyboardWordInput `enabled`). These were previously two separate
 * expressions and the keyboard one additionally required `gameActive`; since
 * `gameActive` starts false and only flips true via a race-prone activation
 * effect (and is hardcoded per host/player path), a player could end up able to
 * tap tiles but unable to type. Routing both through this helper guarantees they
 * stay in lockstep: if you can select a tile by mouse, you can type a word.
 *
 * Boundaries are covered without `gameActive`:
 *  - start/reveal countdown → `showStartAnimation` is true → not interactive
 *  - host broadcast / spectator → `isPlaying` is false → not interactive
 *  - game over → InGameScreen unmounts into the results screen
 */
export interface BoardInteractiveState {
  /** Local participant is playing (false for host broadcast/TV mode). */
  isPlaying: boolean;
  /** Start/mode-reveal countdown animation is on screen. */
  showStartAnimation: boolean;
}

export function isBoardInteractive({ isPlaying, showStartAnimation }: BoardInteractiveState): boolean {
  return isPlaying && !showStartAnimation;
}
