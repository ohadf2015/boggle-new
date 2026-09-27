/**
 * Who paints on top at the end of a classroom round.
 *
 * Two surfaces in this app are `fixed inset-0` and fully opaque: the projector
 * LOBBY (`components/education/projector/ProjectorLobby`, z-[65]) and the
 * projector RESULTS screen. At the instant a round ends both are mounted —
 * `HostView` renders the lobby whenever no board is live, and the results
 * whenever `finalScores` is set, and "the round just finished" is both of those
 * at once. Whichever sits higher is the only one anybody in the room sees.
 *
 * Round 2's verdict read that as the results "unmounting in under a second".
 * It never unmounted: it was painted over for the whole time it was up. The
 * number below is the entire fix, and it is written down here — with a test
 * that reads the lobby's own file — because a z-index that lives only as a
 * literal inside one className is invisible exactly while it is wrong.
 *
 * Chosen to clear the two things that legitimately sit above a live round:
 * the lobby (65) and the teacher's docked live-controls strip (70, and it
 * hides itself on `boardEnd` anyway). It deliberately stays BELOW the app's
 * install/consent portals (100 / 200) — those covering a results screen is a
 * real bug, but it is the shell's to fix, not something to win by escalation.
 */

/** `ProjectorLobby`'s own stacking level. Asserted against its file in tests. */
export const PROJECTOR_LOBBY_Z = 65;

/** The classroom results screen. Must stay above the lobby — see above. */
export const PROJECTOR_RESULTS_Z = 75;

/**
 * The invariant, as a function rather than a comment, so a regression is a red
 * test instead of a wall that reads "PLAYING NOW" during the celebration.
 */
export function projectorResultsCoverLobby(): boolean {
  return PROJECTOR_RESULTS_Z > PROJECTOR_LOBBY_Z;
}

export default projectorResultsCoverLobby;
