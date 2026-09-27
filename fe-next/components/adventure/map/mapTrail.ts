/**
 * The route so far, flattened into one readable line.
 *
 * The map itself already paints history (solid = walked, dashed = unexplored),
 * but a vertical act map is taller than the screen: by floor 5 the first two
 * nodes have scrolled away, and a glance — or a screenshot — reads only the
 * part of the run that happens to be in frame. This turns `run.path` into a
 * fixed-size strip so the WHOLE route is legible without scrolling, which is
 * something the reference map cannot do.
 *
 * Pure on purpose: the strip is a renderer, the numbering rules live here.
 */
import type { NodeKind, RunMap } from '@/lib/adventure/play/runMap';

export interface TrailStep {
  id: string;
  kind: NodeKind;
  /** 1-based position in the walked route. */
  step: number;
  /** The node the run is standing on right now (never true after the run ends). */
  current: boolean;
}

/**
 * One entry per node the run actually walked, oldest first. Ids the map does
 * not know are dropped (a stale token from an older map must not blank the
 * strip) and the numbering closes over the gap, so the last step always equals
 * the number of floors behind the player.
 */
export function trailSteps(
  map: RunMap,
  path: readonly string[],
  currentNode: string | null | undefined,
): TrailStep[] {
  const kindOf = new Map(map.nodes.map((n) => [n.id, n.kind]));
  const out: TrailStep[] = [];
  for (const id of path) {
    const kind = kindOf.get(id);
    if (!kind) continue;
    out.push({ id, kind, step: out.length + 1, current: id === currentNode });
  }
  return out;
}
