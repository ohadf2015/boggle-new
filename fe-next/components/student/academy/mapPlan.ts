/**
 * Which islands the map shows and where the art goes, for one view.
 *
 * A short screen cannot hold the whole path with readable plaques. Rather than
 * shrink the art into a strip and stack islands on each other, the map sheds
 * islands: the next step stays, then Missed Words and Word Workshop (only the
 * map links to them), then what is ahead, then what is behind. The boss stays
 * as the goal. A shed lesson is still in the dock's Lessons list.
 *
 * Pure; px in, plan out.
 */

import { ISLANDS, CASTLE, MAP_ASPECT, type IslandPoint } from './academyNodes';
import { placeIslands, type AcademyIsland } from './academyIslands';
import { fitArt, type ArtFit, type FitPoint, type Insets } from './artFit';

/** Deepest crowding level (see nodeExtents). */
export const MAX_COMPACT = 3;

export interface MapPlanInput {
  islands: AcademyIsland[];
  boss: AcademyIsland | null;
  recommendedKey: string | null;
  layout: 'portrait' | 'landscape';
  view: { width: number; height: number };
  insets: Insets;
  /** False without a layout engine (tests, a first frame): full detail, every island. */
  measured: boolean;
  extentsOf: (node: AcademyIsland, recommended: boolean, compact: number) => Omit<FitPoint, 'x' | 'y'>;
}

export interface MapPlan {
  shown: AcademyIsland[];
  points: IslandPoint[];
  fit: ArtFit;
  compact: number;
  focus: IslandPoint | null;
}

const MAP_ONLY: Partial<Record<AcademyIsland['kind'], number>> = { review: 1, workshop: 2 };

export function keepOrder(islands: AcademyIsland[], recommendedKey: string | null): AcademyIsland[] {
  const at = islands.findIndex((n) => n.key === recommendedKey);
  const rank = (n: AcademyIsland, i: number): number => {
    if (i === at) return 0;
    const only = MAP_ONLY[n.kind];
    if (only) return only;
    if (at < 0) return 10 + (islands.length - i);
    return i > at ? 10 + (i - at) : 100 + (at - i);
  };
  return islands
    .map((n, i) => ({ n, r: rank(n, i) }))
    .sort((a, b) => a.r - b.r)
    .map(({ n }) => n);
}

export function planMap(input: MapPlanInput): MapPlan {
  const { islands, boss, recommendedKey, layout, view, insets, measured, extentsOf } = input;
  const slots = ISLANDS[layout];
  const castle = CASTLE[layout];
  const aspect = MAP_ASPECT[layout];
  const priority = keepOrder(islands, recommendedKey);
  const maxLevel = measured ? MAX_COMPACT : 0;
  const minKeep = measured ? Math.min(1, islands.length) : islands.length;

  let best: MapPlan | null = null;
  for (let keep = islands.length; keep >= minKeep; keep--) {
    const kept = new Set(priority.slice(0, keep).map((n) => n.key));
    const shown = islands.filter((n) => kept.has(n.key));
    const points = placeIslands(shown.length, slots);
    const nodes = shown.length
      ? [...shown.map((node, i) => ({ node, at: points[i] })), ...(boss ? [{ node: boss, at: castle }] : [])]
      : [];
    const focusIndex = shown.findIndex((n) => n.key === recommendedKey);
    const focus = focusIndex >= 0 ? points[focusIndex] : boss && recommendedKey === boss.key ? castle : null;
    for (let level = 0; level <= maxLevel; level++) {
      const pts = nodes.map(({ node, at }) => ({ ...at, ...extentsOf(node, node.key === recommendedKey, level) }));
      const fit = fitArt({ view, aspect, points: pts, insets, focus });
      best = { shown, points, fit, compact: level, focus };
      if (!fit.crowded && !fit.spills) return best;
    }
  }
  return best ?? { shown: [], points: [], fit: fitArt({ view, aspect, points: [], insets }), compact: 0, focus: null };
}
