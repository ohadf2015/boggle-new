/**
 * Which floor of the act the run is standing on.
 *
 * Counted the SAME way `RunMapScreen` counts it (`run.path.length`), so the
 * map, the level header and the intro card can never print two numbers for one
 * place. `lvl.level` is the LevelSpec slot the node borrows its board from —
 * a table index, never a floor, and under a branching map two neighbouring
 * fights can share one slot.
 */
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunMap } from '@/lib/adventure/play/runMap';

export interface RunFloor {
  step: number;
  total: number;
}

export function runFloor(
  map: RunMap | null | undefined,
  run: Pick<PublicRun, 'path'> | null | undefined,
): RunFloor | null {
  if (!map || !run || !Array.isArray(run.path) || run.path.length === 0) return null;
  return { step: Math.min(map.rows, Math.max(1, run.path.length)), total: map.rows };
}
