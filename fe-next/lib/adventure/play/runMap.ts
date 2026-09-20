/**
 * The branching act map for one world — a Slay-the-Spire node graph, pure and
 * seeded from the run seed so client and server derive the SAME map and never
 * have to put it on the wire as state.
 *
 * Shape: 8 rows read bottom-to-top. Row 0 is always fights (the act opens on a
 * real choice of three-to-four boards, never a shop). Elites and rests are
 * barred from the first two rows, every node of the row below the boss is a
 * rest, and the boss is a single node on top.
 *
 * Fight nodes borrow the world's existing LevelSpec by row, so the per-world
 * twist escalation in WORLD_LEVELS still drives the boards. Levels 4 and 7 are
 * reserved for elite and boss specs, so a fight never lands on a combat spec.
 */
import { makeRng } from './rng';
import { ELITE_LEVEL, BOSS_LEVEL, LEVELS_PER_WORLD, WORLD_COUNT } from './levels';

export type NodeKind = 'fight' | 'elite' | 'treasure' | 'shop' | 'rest' | 'event' | 'boss';

export interface MapNode {
  id: string;
  row: number;
  lane: number;
  kind: NodeKind;
  /** Play nodes only: the WORLD_LEVELS slot this node is fought on. */
  level?: number;
}

export interface MapEdge { from: string; to: string }

export interface RunMap {
  world: number;
  rows: number;
  nodes: MapNode[];
  edges: MapEdge[];
}

export const MAP_ROWS = 8;
/** Every node on this row is a rest — the calm beat before the boss. */
export const REST_ROW = MAP_ROWS - 2;
export const BOSS_ROW = MAP_ROWS - 1;

/**
 * Which LevelSpec a fight on each row plays. Monotonic (difficulty only rises)
 * and never 4 or 7 — those slots are the elite and boss specs.
 */
export const FIGHT_LEVEL_BY_ROW = [1, 2, 3, 5, 6, 6, 6, 6];

export const isPlayNode = (k: NodeKind) => k === 'fight' || k === 'elite' || k === 'boss';

export const nodeId = (row: number, lane: number) => `r${row}l${lane}`;

export function nodeLevel(node: Pick<MapNode, 'kind' | 'row'>): number | null {
  if (node.kind === 'boss') return BOSS_LEVEL;
  if (node.kind === 'elite') return ELITE_LEVEL;
  if (node.kind !== 'fight') return null;
  const lvl = FIGHT_LEVEL_BY_ROW[Math.min(node.row, FIGHT_LEVEL_BY_ROW.length - 1)];
  return Math.min(Math.max(1, lvl), LEVELS_PER_WORLD);
}

/** Weighted kind pools per row band. Row 0 / rest row / boss row are fixed. */
const EARLY_POOL: Array<[NodeKind, number]> = [['fight', 6], ['event', 3], ['treasure', 2]];
const MID_POOL: Array<[NodeKind, number]> = [['fight', 5], ['event', 3], ['elite', 2], ['shop', 2], ['treasure', 2]];

function pickWeighted(pool: Array<[NodeKind, number]>, rand: () => number): NodeKind {
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let roll = rand() * total;
  for (const [kind, w] of pool) {
    roll -= w;
    if (roll < 0) return kind;
  }
  return pool[pool.length - 1][0];
}

function rowKinds(row: number, lanes: number, rand: () => number): NodeKind[] {
  if (row === 0) return Array.from({ length: lanes }, () => 'fight' as NodeKind);
  if (row === REST_ROW) return Array.from({ length: lanes }, () => 'rest' as NodeKind);
  if (row === BOSS_ROW) return ['boss'];
  const pool = row === 1 ? EARLY_POOL : MID_POOL;
  const out: NodeKind[] = [];
  for (let lane = 0; lane < lanes; lane++) {
    let kind = pickWeighted(pool, rand);
    // At most one elite and one shop per row — a row of elites is not a choice.
    if ((kind === 'elite' || kind === 'shop') && out.includes(kind)) kind = 'fight';
    out.push(kind);
  }
  return out;
}

/** 1-3 forward edges, drifting at most one lane — crossings come from neighbours swapping. */
function rowEdges(row: number, from: NodeKind[], to: NodeKind[], rand: () => number): MapEdge[] {
  const edges: MapEdge[] = [];
  const add = (a: number, b: number) => {
    const e = { from: nodeId(row, a), to: nodeId(row + 1, b) };
    if (!edges.some((x) => x.from === e.from && x.to === e.to)) edges.push(e);
  };
  for (let lane = 0; lane < from.length; lane++) {
    // Clamp rather than drop, so a narrowing row (the single boss) stays reachable from every lane.
    const cands = [...new Set([lane - 1, lane, lane + 1].map((l) => Math.min(to.length - 1, Math.max(0, l))))];
    // 2-3 forward edges wherever the next row is wide enough: one edge per node
    // collapses the act into a corridor and the map stops being a choice.
    const want = Math.min(cands.length, 2 + Math.floor(rand() * 2));
    // Always keep the straight-ahead link when it exists, then fan out seeded.
    const ordered = [...cands].sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane) || a - b);
    for (let i = 0; i < want && i < ordered.length; i++) add(lane, ordered[i]);
  }
  // Orphan repair: every node of the next row must be enterable.
  for (let lane = 0; lane < to.length; lane++) {
    if (edges.some((e) => e.to === nodeId(row + 1, lane))) continue;
    const src = Math.min(from.length - 1, Math.max(0, lane));
    add(src, lane);
  }
  return edges;
}

export function buildRunMap(seed: string, world: number): RunMap {
  const w = Math.min(Math.max(1, Math.floor(world) || 1), WORLD_COUNT);
  const rand = makeRng(`${seed}:map:${w}`);
  const lanes = rand() < 0.5 ? 3 : 4;

  const kindsByRow: NodeKind[][] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    kindsByRow.push(rowKinds(row, row === BOSS_ROW ? 1 : lanes, rand));
  }

  // Guarantee the two beats a run is built around: one elite detour, one shop.
  // Each forcing row is disjoint, so neither can clobber the other's guarantee.
  const has = (kind: NodeKind) => kindsByRow.slice(2, REST_ROW).some((r) => r.includes(kind));
  const forceInto = (kind: NodeKind, row: number) => {
    const lanesInRow = kindsByRow[row];
    // Never overwrite the sibling guarantee: a row caps at one elite and one shop,
    // so a fight/treasure/event lane always exists to convert.
    const lane = lanesInRow.findIndex((k) => k !== 'elite' && k !== 'shop');
    lanesInRow[lane >= 0 ? lane : 0] = kind;
  };
  if (!has('shop')) forceInto('shop', REST_ROW - 1);
  if (!has('elite')) forceInto('elite', 3);

  const nodes: MapNode[] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    kindsByRow[row].forEach((kind, lane) => {
      const level = nodeLevel({ kind, row });
      nodes.push({ id: nodeId(row, lane), row, lane, kind, ...(level != null ? { level } : {}) });
    });
  }

  const edges: MapEdge[] = [];
  for (let row = 0; row < BOSS_ROW; row++) {
    edges.push(...rowEdges(row, kindsByRow[row], kindsByRow[row + 1], rand));
  }

  return { world: w, rows: MAP_ROWS, nodes, edges };
}

export const nodeById = (map: RunMap, id: unknown): MapNode | null =>
  (typeof id === 'string' ? map.nodes.find((n) => n.id === id) ?? null : null);

/** Legal next moves: row 0 when the run has not entered the map yet, else the node's own edges. */
export function reachableFrom(map: RunMap, current: string | null | undefined): string[] {
  if (current == null) return map.nodes.filter((n) => n.row === 0).map((n) => n.id);
  if (!nodeById(map, current)) return [];
  return map.edges.filter((e) => e.from === current).map((e) => e.to);
}

export const canEnter = (map: RunMap, current: string | null | undefined, target: unknown): boolean =>
  typeof target === 'string' && reachableFrom(map, current).includes(target);
