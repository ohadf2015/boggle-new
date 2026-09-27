/**
 * When the classroom host's join code may leave the screen.
 *
 * INCIDENT (2026-08-30): a teacher created five classroom rooms in 37 minutes
 * and no student ever joined. Reproduced on production — the host screen
 * contained the game code ZERO times (innerText and innerHTML both). The
 * classroom header and the code/QR panel were gated on `isActive`, but
 * `isActive` is set by `onJoined`, i.e. the instant the host lands in the
 * LOBBY. So the code disappeared at exactly the moment the teacher needed to
 * read it onto a projector, and the only way to see it was to discover the
 * TV/Projector toggle.
 *
 * The intent was always "hide it during gameplay to maximise grid space".
 * `gameActive` is that predicate; `isActive` merely means "in a room".
 */

interface ChromeState {
  /** True only while a round is actually being played. */
  gameActive: boolean;
  /** True while the post-round results screen is up. */
  showResults: boolean;
}

/** Hide the classroom header + code panel only during live gameplay. */
export function hideClassroomChrome({ gameActive, showResults }: ChromeState): boolean {
  return gameActive && !showResults;
}

/**
 * Whether to render the FULL classroom panel (game code, QR, lesson, settings)
 * rather than the slim banner. The full panel is what carries the join code, so
 * it stays up for the whole lobby and only collapses once play begins.
 */
export function classroomPanelExpanded({ gameActive }: Pick<ChromeState, 'gameActive'>): boolean {
  return !gameActive;
}
