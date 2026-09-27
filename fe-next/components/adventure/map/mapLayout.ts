/**
 * Pure geometry + state for the act map screen. Everything the screen draws —
 * where a node sits, which line joins two nodes, and how a node should read
 * (walked / here / choosable / out of reach) — is computed here so the screen
 * component stays a renderer and the rules can be tested without a DOM.
 *
 * Coordinates: `x` is a PERCENT of the map width (physical, never mirrored —
 * a vertical map reads bottom-to-top in every language, so RTL must not flip
 * it or the SVG edges would detach from the node buttons in `he` only) and
 * `y` is PIXELS from the top of the scroll canvas, so row 0 sits at the bottom
 * and the boss on top.
 */
import { isPlayNode, type MapNode, type RunMap } from '@/lib/adventure/play/runMap';
import { makeRng } from '@/lib/adventure/play/rng';

/** Vertical distance between two rows. One row ≈ one thumb-flick on a 390px phone. */
export const ROW_GAP_PX = 120;
/** Breathing room above the boss and below row 0. */
export const MAP_PAD_PX = 56;
/** Lanes never reach the edge: the node badge + its hard shadow must stay on screen. */
export const MIN_X = 8;
export const MAX_X = 92;
/** Organic drift off the lane centre, seeded from the node id (never random). */
const JITTER_PCT = 4;

export interface LaidNode { node: MapNode; x: number; y: number }
export interface EdgeLine { from: string; to: string; x1: number; y1: number; x2: number; y2: number }
export type NodeStatus = 'done' | 'current' | 'next' | 'far';

/**
 * How big the map draws itself. A phone gets a narrow column; a TV gets a
 * WIDER LATTICE WITH BIGGER NODES — deliberately capped well under the
 * viewport (the rails eat the rest) because stretching three lanes across
 * 1280px makes the act sparser, not denser. The gutters TIGHTEN as the
 * lattice widens for the same reason, and the row gap barely moves so a big
 * screen shows MORE rows at once rather than fewer.
 */
export interface MapScale {
  /** Vertical distance between two rows, px. */
  gap: number;
  /** Breathing room above the boss / below row 0, px. */
  pad: number;
  /** Hard cap on the lattice width, px. */
  maxW: number;
  /** Lane gutters, as a percent of the lattice width. */
  minX: number;
  maxX: number;
  /** Node badge size tier. */
  node: 'sm' | 'md' | 'lg';
  /** Run state + goal/legend move out of the header into side rails. */
  rails: boolean;
}

/** Width of ONE side rail (`w-[13.5rem]`), and the scroll box's own horizontal padding. */
export const RAIL_PX = 216;
export const MAP_GUTTER_PX = 16;

export const PHONE_SCALE: MapScale = { gap: ROW_GAP_PX, pad: MAP_PAD_PX, maxW: 448, minX: MIN_X, maxX: MAX_X, node: 'sm', rails: false };
/** Tablet: bigger nodes and a wider column, but NO rails — two of them would leave less than a phone. */
export const TABLET_SCALE: MapScale = { gap: 128, pad: 64, maxW: 660, minX: 10, maxX: 90, node: 'md', rails: false };
export const TV_SCALE: MapScale = { gap: 140, pad: 72, maxW: 840, minX: 14, maxX: 86, node: 'lg', rails: true };

/**
 * The width at which the rails can be afforded: below it, taking 2×216px for
 * rails would leave the lattice NARROWER than it is on a phone.
 */
export const RAILS_MIN_PX = PHONE_SCALE.maxW + RAIL_PX * 2 + MAP_GUTTER_PX;

/** Breakpoints are on the WIDTH OF THE SURFACE, not the window — the map is a panel. */
export function mapScale(width: number): MapScale {
  if (width >= RAILS_MIN_PX) return TV_SCALE;
  if (width >= 768) return TABLET_SCALE;
  return PHONE_SCALE;
}

export const mapHeight = (rows: number, s: MapScale = PHONE_SCALE) => (Math.max(1, rows) - 1) * s.gap + s.pad * 2;

export const rowY = (row: number, rows: number, s: MapScale = PHONE_SCALE) => s.pad + (Math.max(1, rows) - 1 - row) * s.gap;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Node centres. Lane order is preserved: the jitter is always smaller than half a lane. */
export function layoutMap(map: RunMap, s: MapScale = PHONE_SCALE): LaidNode[] {
  const lanesInRow = new Map<number, number>();
  for (const n of map.nodes) lanesInRow.set(n.row, Math.max(lanesInRow.get(n.row) ?? 0, n.lane + 1));

  return map.nodes.map((node) => {
    const lanes = lanesInRow.get(node.row) ?? 1;
    const base = ((node.lane + 0.5) / lanes) * 100;
    const drift = lanes > 1 ? (makeRng(`lane:${node.id}`)() * 2 - 1) * JITTER_PCT : 0;
    return { node, x: clamp(Math.round((base + drift) * 100) / 100, s.minX, s.maxX), y: rowY(node.row, map.rows, s) };
  });
}

export function edgeLines(map: RunMap, laid: LaidNode[]): EdgeLine[] {
  const by = new Map(laid.map((n) => [n.node.id, n]));
  const lines: EdgeLine[] = [];
  for (const edge of map.edges) {
    const a = by.get(edge.from);
    const b = by.get(edge.to);
    if (a && b) lines.push({ from: edge.from, to: edge.to, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return lines;
}

/**
 * How each node reads. `blocked` = the run is standing on a fight it has not
 * played out, so the next row is not a choice yet (leaving a fight and walking
 * around it would skip it for free).
 */
export function nodeStatuses(args: {
  map: RunMap;
  path: readonly string[];
  currentNode: string | null;
  reachable: readonly string[];
  blocked?: boolean;
}): Record<string, NodeStatus> {
  const { map, path, currentNode, reachable, blocked } = args;
  const walked = new Set(path);
  const open = new Set(blocked ? [] : reachable);
  const out: Record<string, NodeStatus> = {};
  for (const n of map.nodes) {
    if (n.id === currentNode) out[n.id] = 'current';
    else if (walked.has(n.id)) out[n.id] = 'done';
    else if (open.has(n.id)) out[n.id] = 'next';
    else out[n.id] = 'far';
  }
  return out;
}

/** Standing on a fight / elite / boss that has not been played out yet. */
export function pendingFight(map: RunMap, currentNode: string | null, cleared: readonly string[]): boolean {
  if (!currentNode) return false;
  const node = map.nodes.find((n) => n.id === currentNode);
  return !!node && isPlayNode(node.kind) && !cleared.includes(currentNode);
}

/** The edge the run actually walked, for the "path taken" trail. */
export function walkedEdges(path: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 1; i < path.length; i++) out.add(`${path[i - 1]}->${path[i]}`);
  return out;
}

export const edgeKey = (e: { from: string; to: string }) => `${e.from}->${e.to}`;
