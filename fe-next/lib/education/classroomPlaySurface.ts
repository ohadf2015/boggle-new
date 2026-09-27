/**
 * Is this live multiplayer room actually a class session, seen by a STUDENT?
 *
 * `?classroom=true` is the only signal that separates the two. Every student
 * entry point sets it — `components/education/join/useJoinFlow.ts`,
 * `components/student/ClassroomGameBanner.tsx`,
 * `components/student/PlayWithClassButton.tsx` — and the teacher's own entry
 * adds `&host=true` on top of it.
 *
 * Why the URL and not game state: the server never tells a player mid-round
 * that their room belongs to a classroom. `classroomSummary` exists, but it
 * arrives with the round RESULTS, far too late to decide what the HUD shows
 * during play. The query string, by contrast, is already in the address bar
 * when the page first paints — there is no window in which an optimistic
 * "public room" HUD renders and is then flipped by a later source (recurring
 * pitfall class 1).
 *
 * `components/education/shell/quietChromeRoutes.ts` deliberately matches on
 * path segments instead; `usePathname()` carries no query string, so it cannot
 * use this. The two are not duplicates — they read different things.
 */
export function isClassroomStudentPlay(
  params: URLSearchParams | null | undefined,
): boolean {
  if (!params) return false;
  // Literal 'true' only. `?classroom=1` is not a shape anything in this repo
  // emits, and accepting truthy-looking values would let a stray link quietly
  // re-frame a public room.
  if (params.get('classroom') !== 'true') return false;
  // The teacher is not the student this framing protects.
  return params.get('host') !== 'true';
}

export default isClassroomStudentPlay;
