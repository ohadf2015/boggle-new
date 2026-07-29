/**
 * Query params that, when present at the moment a user exits a multiplayer
 * room, send the post-reload boot path back into the same room/mode they
 * just left. The audit (multiplayer-ux-2026-05-04 #5) flagged classroom
 * mode in particular: `?classroom=true&host=true` survived the reload and
 * trapped the user in the classroom lobby they were trying to leave.
 *
 * `room` was already being stripped by `usePlayerExit`; the others were not.
 */
export const MULTIPLAYER_EXIT_TRAP_PARAMS = ['room', 'classroom', 'host'] as const;

/**
 * Returns `url` with all multiplayer exit-trap params removed. Other query
 * params, the path, and the hash fragment are preserved. Pure function — no
 * side effects on `window.history`.
 */
export function stripMultiplayerExitParams(url: string): string {
  const parsed = new URL(url);
  for (const key of MULTIPLAYER_EXIT_TRAP_PARAMS) {
    parsed.searchParams.delete(key);
  }
  return parsed.toString();
}
