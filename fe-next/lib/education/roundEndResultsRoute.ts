/**
 * roundEndResultsRoute — who owns the screen when a classroom round ends.
 *
 * A classroom round has exactly one end-of-round surface per device: the
 * projector gets `ClassroomTvResultsScreen` (inside HostView) and every phone
 * gets `ClassroomResultsCard` (inside ResultsPage). Both are gated on the
 * server-built `classroomSummary`. The ROUTING that decides which tree is
 * mounted used to be gated on something else — the game mode — and the two
 * disagreed, which is recurring-pitfalls Class 3 in its purest form: the happy
 * path (Classic) was tested every round and the sibling path silently diverged.
 *
 * What that cost, measured: with NEXT ROUND MODE set to `random`, a rematch
 * that resolved to `wheel-rush` hit a bypass in `useHostGameEvents` and pushed
 * the teacher onto the arcade ResultsPage. The projector recap lives in the
 * tree that just unmounted, and the bypass payload did not carry
 * `classroomSummary`, so neither surface rendered. The class saw the Wheel
 * Rush results hero ("WHEEL SETTLES") and then the next lobby: no podium, no
 * coverage meter, no win moment, one round in every four or five.
 *
 * So both decisions now read the SAME value the render branches read. Routing
 * and rendering cannot drift, and a mode added next sprint is covered by
 * default instead of by remembering to add it here.
 */

/**
 * The modes the CLIENT's next-round selector offers (`ALL_MODES` in
 * `components/results/StickyReadyBar.tsx`). Not the set `random` can deal:
 * the server rolls `selectNextGameMode(history, ALL_GAME_MODES)`, a SUPERSET
 * that also carries word-tower / sealed-bid / crossword. That mismatch is
 * exactly why a per-mode allowlist was never a safe way to protect the recap,
 * and why the decision below keys on `classroomSummary` instead. This list is
 * a convenience for tests, never a gate.
 */
export const NEXT_ROUND_MODES = [
  'word-hunt',
  'classic',
  'wheel-rush',
  'blast',
  'random',
] as const;

export interface HostResultsRouteInput {
  /** False for every classroom room — `useHostViewState` hard-sets broadcast. */
  hostPlaying: boolean;
  /** The mode the round that just ended was played in. */
  gameMode?: string | null;
  /** Server-built and present for every player of a teacher-launched room. */
  hasClassroomSummary: boolean;
}

/**
 * True when the host should leave HostView for the standard ResultsPage.
 *
 * Two reasons only:
 *  - the host was PLAYING, so the standard results page is their results page;
 *  - an ARCADE wheel-rush round ended in broadcast mode. That mode has no TV
 *    results view, so without this the host sits on the dead game screen until
 *    they reload. This is the original bypass and it stays exactly as strong.
 *
 * A classroom room is never either: it always has its own projector recap, so
 * the mode is irrelevant and the teacher stays put.
 */
export function hostLeavesProjectorRecap({
  hostPlaying,
  gameMode,
  hasClassroomSummary,
}: HostResultsRouteInput): boolean {
  if (hostPlaying) return true;
  if (hasClassroomSummary) return false;
  return gameMode === 'wheel-rush';
}

/**
 * True when a game mode's own results hero (Wheel Rush's radial scene, Blast's
 * ranked list) may take the top slot on ResultsPage.
 *
 * In a classroom round it may not: the lesson recap is the moment a student
 * came for, and a mode scene above it pushes the podium, the delta chip and
 * the coverage meter below the fold on a 390px phone. One predicate so the
 * desktop and mobile layouts cannot answer this differently.
 */
export function modeSceneOwnsHeroSlot({
  hasClassroomSummary,
}: Pick<HostResultsRouteInput, 'hasClassroomSummary'>): boolean {
  return !hasClassroomSummary;
}
