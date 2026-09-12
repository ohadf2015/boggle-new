/**
 * The teacher is not a contestant.
 *
 * A classroom room forces its host into broadcast mode — `useHostViewState`
 * hard-sets `hostPlaying = false` for any room with lesson data — but the host
 * is still a socket in the room, so the server's score calculator still ranks
 * them. On a board where the class is off to a slow start, a teacher who never
 * touched a tile ties everyone at zero and the sort puts the adult on top.
 *
 * Seen on a real projector (room DQRV92, 2026-09-11 23:41): the wall read
 * "WE HAVE A WINNER! Mr. Gauntlet B — 0" over three children's plinths, and a
 * student's phone told them they came "2nd of 4" in a class of three.
 *
 * The arithmetic lives here, once, and both the projector and the phone card
 * call it — the room must never hold two answers to "who came second"
 * (Pitfall Class 3: one computation, many renderers). It is deliberately a
 * NAME match rather than a role lookup: `ClassroomSummary.teacherName` is the
 * only identity the server puts on the wire that every surface already has,
 * and it is the same string the host plays under.
 */

import type { ClassroomPodiumEntry } from '@/shared/types/classroom';

/** Trimmed + lowercased, so " Mr. Gauntlet B " and the socket name match. */
function key(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The plinths, with the host removed and the survivors re-ranked 1..n.
 *
 * Re-ranking is the point. Dropping rank 1 and leaving a podium that starts at
 * rank 2 would draw a silver plinth taller than nothing and put no crown on
 * the wall — the room would see second place win.
 *
 * Two deliberate no-ops: an empty/absent podium, and a podium the host is the
 * ONLY entry on (a teacher demoing the room alone). A one-name podium is
 * honest; an empty one looks like the results failed to load.
 */
export function podiumWithoutHost(
  podium: ClassroomPodiumEntry[] | undefined,
  teacherName: string
): ClassroomPodiumEntry[] {
  const entries = podium ?? [];
  const host = key(teacherName ?? '');
  if (!host || entries.length === 0) return entries;

  const kept = entries.filter((p) => key(p.username) !== host);
  // Nothing removed ⇒ nothing to renumber. The server's ranks are the room's
  // ranks; this function only repairs the hole it made itself.
  if (kept.length === entries.length || kept.length === 0) return entries;

  return kept.map((p, index) => ({ ...p, rank: index + 1 }));
}

/**
 * The same removal for the server's final standings, which the student's own
 * placing card counts itself against. Order is the SERVER's throughout — only
 * a row is dropped, nothing is re-sorted.
 */
export function standingsWithoutHost<T extends { username: string }>(
  standings: T[] | undefined,
  teacherName: string
): T[] {
  const rows = standings ?? [];
  const host = key(teacherName ?? '');
  if (!host || rows.length === 0) return rows;

  const kept = rows.filter((p) => key(p.username) !== host);
  return kept.length === 0 ? rows : kept;
}

export default podiumWithoutHost;
