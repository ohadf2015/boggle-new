/**
 * World trail geometry for the level map: one silhouette per level kind, node
 * positions on a board that climbs from level 1 (bottom) to the boss (top),
 * node status, and the per-world difficulty ramp. Pure: no React.
 */
import { getPlayLevel, LEVELS_PER_WORLD, type LevelKind } from '@/lib/adventure/play/levels';
import { levelThreat, type PathState } from './levelKinds';

export type NodeShape = 'square' | 'diamond' | 'hexagon' | 'cloud' | 'bomb' | 'shield' | 'burst';

/** Every kind reads by outline alone, before colour or icon. */
export const NODE_SHAPE: Record<LevelKind, NodeShape> = {
  classic: 'square',
  hunt: 'diamond',
  chain: 'hexagon',
  fog: 'cloud',
  bomb: 'bomb',
  elite: 'shield',
  boss: 'burst',
};

/** Board units: the map keeps this aspect at every width (phone and TV). */
export const TRAIL_W = 100;
export const TRAIL_H = 176;

const SIZE: Record<'normal' | 'elite' | 'boss', number> = { normal: 20, elite: 30, boss: 40 };

// Slot centres, level 1 first. Normal nodes zig-zag near the middle with their labels on the
// OUTER side, so the road between them never runs under a label; elite/boss get the room.
const SLOTS: Array<[number, number]> = [
  [63, 165], [37, 146], [63, 127], [36, 101], [63, 75], [37, 56], [50, 24],
];

/** Label geometry in board units (the renderer sizes its boxes to match). */
export const LABEL = { gap: 1.5, w: 25, h: 14, plateOverlap: { elite: 5, boss: 10 }, plateH: 11, plateW: { elite: 32, boss: 44 } } as const;

export interface TrailNode {
  level: number;
  kind: LevelKind;
  x: number;
  y: number;
  size: number;
  /** Normal nodes: the outer side. Elite/boss: a nameplate across the node's foot. */
  labelSide: 'left' | 'right' | 'plate';
}

const isBig = (k: LevelKind) => k === 'elite' || k === 'boss';

/** Node side length in board units (board width = 100). */
export const nodeSize = (k: LevelKind) => (k === 'boss' ? SIZE.boss : k === 'elite' ? SIZE.elite : SIZE.normal);

export function trailNodes(kinds: LevelKind[]): TrailNode[] {
  return kinds.map((kind, i) => {
    const [x, y] = SLOTS[Math.min(i, SLOTS.length - 1)];
    const size = nodeSize(kind);
    const labelSide = isBig(kind) ? 'plate' : x < TRAIL_W / 2 ? 'left' : 'right';
    return { level: i + 1, kind, x, y, size, labelSide };
  });
}

export function labelBox(n: TrailNode): { x0: number; x1: number; y0: number; y1: number } {
  if (n.labelSide === 'plate') {
    const w = n.kind === 'boss' ? LABEL.plateW.boss : LABEL.plateW.elite;
    const y0 = n.y + n.size / 2 - (n.kind === 'boss' ? LABEL.plateOverlap.boss : LABEL.plateOverlap.elite);
    return { x0: n.x - w / 2, x1: n.x + w / 2, y0, y1: y0 + LABEL.plateH };
  }
  const edge = n.labelSide === 'left' ? n.x - n.size / 2 - LABEL.gap : n.x + n.size / 2 + LABEL.gap;
  const [x0, x1] = n.labelSide === 'left' ? [edge - LABEL.w, edge] : [edge, edge + LABEL.w];
  return { x0, x1, y0: n.y - LABEL.h / 2, y1: n.y + LABEL.h / 2 };
}

export type NodeStatus = 'cleared' | 'current' | 'open' | 'locked';

/** An active run decides the path; otherwise lifetime stars + unlocks do. */
export function nodeStatus(n: { stars: number; isUnlocked: boolean; isCurrent: boolean; pathState: PathState | null }): NodeStatus {
  if (!n.isUnlocked) return 'locked';
  if (n.pathState) return n.pathState === 'cleared' ? 'cleared' : n.pathState === 'current' ? 'current' : 'open';
  if (n.isCurrent) return 'current';
  return n.stars > 0 ? 'cleared' : 'open';
}

/** The link INTO a node is walked once that node is reached. */
export const linkDone = (upper: NodeStatus) => upper === 'cleared' || upper === 'current';

export interface RampStep { level: number; kind: LevelKind; threat: number }

/** Threat per level for one world (the header's difficulty strip). */
export function rampOf(world: number): RampStep[] {
  return Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
    const lvl = getPlayLevel(world, i + 1);
    return { level: i + 1, kind: lvl.kind, threat: levelThreat(lvl) };
  });
}

/** Smooth path through node centres (Catmull-Rom → cubic Bézier), one segment per link. */
export function linkPaths(nodes: Array<{ x: number; y: number }>): string[] {
  const out: string[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)];
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    const f = (n: number) => n.toFixed(1);
    out.push(`M${f(p1.x)} ${f(p1.y)} C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`);
  }
  return out;
}
