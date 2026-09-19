/**
 * Client-only level-variant rules (pure). Fog and bomb are PRESENTATION rules:
 * the server scores any valid board word regardless of fog or bombs, so nothing
 * here may feed scoreRun/settleRun. ponytail: a bomb's seconds penalty is
 * client-reported like the clock itself (single-player, beta).
 */

export type Cell = readonly [number, number];
const key = (r: number, c: number) => `${r}-${c}`;

export interface FogOptions {
  /** Tile the fog opens around before the first word (seeded per level). */
  start: Cell;
  /** Blackout twist: only the LAST tile of the word lights its neighbours. */
  blackout?: boolean;
  /** Extra rings of visibility — grows while the player is stuck, so fog never locks a board. */
  expand?: number;
}

/** Visible tile keys: every anchor tile plus neighbours within 1 + expand rings. */
export function fogVisible(size: number, path: readonly Cell[] | null, { start, blackout, expand = 0 }: FogOptions): Set<string> {
  const anchors: readonly Cell[] = path?.length ? (blackout ? [path[path.length - 1]] : path) : [start];
  const reach = 1 + Math.max(0, expand);
  const out = new Set<string>();
  for (const [r0, c0] of anchors) {
    for (let r = Math.max(0, r0 - reach); r <= Math.min(size - 1, r0 + reach); r++) {
      for (let c = Math.max(0, c0 - reach); c <= Math.min(size - 1, c0 + reach); c++) out.add(key(r, c));
    }
  }
  return out;
}

export const BOMB_PENALTY_MS = 4000;

export interface Bomb { key: string; fuseMs: number; leftMs: number }
export interface BombState { size: number; fuseMs: number; bombs: Bomb[]; defusedCount: number; explodedCount: number }

function freeTile(size: number, taken: Set<string>, rand: () => number): string | null {
  const free: string[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!taken.has(key(r, c))) free.push(key(r, c));
  return free.length ? free[Math.floor(rand() * free.length)] : null;
}

function arm(size: number, fuseMs: number, bombs: Bomb[], avoid: Set<string>, rand: () => number): Bomb[] {
  const taken = new Set([...avoid, ...bombs.map((b) => b.key)]);
  const k = freeTile(size, taken, rand);
  return k ? [...bombs, { key: k, fuseMs, leftMs: fuseMs }] : bombs;
}

/** Opening fuses are staggered (+35% each) so bombs never all blow in one tick. */
export function initBombs(size: number, count: number, rand: () => number, fuseMs: number): BombState {
  let bombs: Bomb[] = [];
  for (let i = 0; i < count; i++) bombs = arm(size, Math.round(fuseMs * (1 + 0.35 * i)), bombs, new Set(), rand);
  return { size, fuseMs, bombs, defusedCount: 0, explodedCount: 0 };
}

/** Count fuses down; spent bombs explode (penalty each) and re-arm on another tile. */
export function tickBombs(s: BombState, dt: number, rand: () => number) {
  const exploded: string[] = [];
  let bombs: Bomb[] = [];
  for (const b of s.bombs) {
    const leftMs = b.leftMs - dt;
    if (leftMs <= 0) exploded.push(b.key); else bombs.push({ ...b, leftMs });
  }
  for (let i = 0; i < exploded.length; i++) bombs = arm(s.size, s.fuseMs, bombs, new Set(exploded), rand);
  return {
    state: { ...s, bombs, explodedCount: s.explodedCount + exploded.length },
    exploded,
    penaltyMs: exploded.length * BOMB_PENALTY_MS,
  };
}

/** A word's path runs over bombs: those are defused and fresh ones armed off the path. */
export function defuseBombs(s: BombState, path: readonly Cell[], rand: () => number) {
  const onPath = new Set(path.map(([r, c]) => key(r, c)));
  const defused = s.bombs.filter((b) => onPath.has(b.key)).map((b) => b.key);
  if (!defused.length) return { state: s, defused };
  let bombs = s.bombs.filter((b) => !onPath.has(b.key));
  for (let i = 0; i < defused.length; i++) bombs = arm(s.size, s.fuseMs, bombs, onPath, rand);
  return { state: { ...s, bombs, defusedCount: s.defusedCount + defused.length }, defused };
}
