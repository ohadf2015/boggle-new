/**
 * Dev-only pathing for the `?node=<kind>` QA walk: which legal move takes the
 * run one step closer to the nearest node of a kind. Breadth-first over the
 * map's own edges, so the walk only ever sends moves the server would accept.
 *
 * Nothing in the shipped game calls this — it exists so a builder can reach a
 * shop / campfire / chest / event screen before the act map is on screen.
 */
import { reachableFrom, type NodeKind, type RunMap } from '@/lib/adventure/play/runMap';

/** The next node to enter, or null when the run is already there (or can never get there). */
export function stepToward(map: RunMap, current: string | null, kind: NodeKind | string): string | null {
  const kindOf = (id: string) => map.nodes.find((n) => n.id === id)?.kind;
  if (current && kindOf(current) === kind) return null;

  const queue: Array<{ id: string; first: string }> = reachableFrom(map, current).map((id) => ({ id, first: id }));
  const seen = new Set(queue.map((q) => q.id));
  while (queue.length) {
    const { id, first } = queue.shift() as { id: string; first: string };
    if (kindOf(id) === kind) return first;
    for (const next of reachableFrom(map, id)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push({ id: next, first });
    }
  }
  return null;
}
