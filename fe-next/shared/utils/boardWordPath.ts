/**
 * Plants one word on a partially filled letter grid along an adjacent
 * (8-direction) path. Shared by the server deal and the client deal so a
 * classroom board and an arcade board seed lesson words the same way.
 *
 * Words are snaked: a word laid in a straight row or column reads off the
 * board at a glance, so a bending path is preferred and a straight one is
 * only the fallback when nothing else fits.
 */

export interface PathCell {
  r: number;
  c: number;
}

type Grid = (string | null)[][];

const STEPS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const SNAKE_STARTS = 60;
/** Caps the DFS per start so a hopeless word on a crowded board cannot stall a deal. */
const SNAKE_NODE_BUDGET = 400;

export function isCollinearPath(path: readonly PathCell[]): boolean {
  if (path.length < 3) return true;
  const dr = path[1].r - path[0].r;
  const dc = path[1].c - path[0].c;
  return path.every((cell, i) => i === 0 || (cell.r - path[i - 1].r === dr && cell.c - path[i - 1].c === dc));
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function fits(grid: Grid, r: number, c: number, ch: string): boolean {
  return r >= 0 && c >= 0 && r < grid.length && c < grid[0].length && (grid[r][c] === null || grid[r][c] === ch);
}

function snakeFrom(grid: Grid, chars: string[], start: PathCell, random: () => number, needBend: boolean): PathCell[] | null {
  const path: PathCell[] = [];
  const seen = new Set<string>();
  let budget = SNAKE_NODE_BUDGET;
  const walk = (r: number, c: number, i: number): boolean => {
    if (budget-- <= 0 || !fits(grid, r, c, chars[i]) || seen.has(`${r},${c}`)) return false;
    seen.add(`${r},${c}`);
    path.push({ r, c });
    if (i === chars.length - 1) {
      if (!needBend || !isCollinearPath(path)) return true;
    } else {
      for (const [dr, dc] of shuffled(STEPS, random)) if (walk(r + dr, c + dc, i + 1)) return true;
    }
    seen.delete(`${r},${c}`);
    path.pop();
    return false;
  };
  return walk(start.r, start.c, 0) ? path : null;
}

function straightFrom(grid: Grid, chars: string[], start: PathCell, random: () => number): PathCell[] | null {
  for (const [dr, dc] of shuffled(STEPS, random)) {
    const path = chars.map((_, i) => ({ r: start.r + i * dr, c: start.c + i * dc }));
    if (path.every((p, i) => fits(grid, p.r, p.c, chars[i]))) return path;
  }
  return null;
}

/**
 * Writes `word` (each letter through `toCell`) onto `grid` and returns its
 * path, or returns null and leaves the grid untouched. Cells already holding
 * the same letter are shared; no other filled cell is ever overwritten.
 */
export function placeWordPath(
  grid: Grid,
  word: string,
  toCell: (letter: string) => string,
  random: () => number = Math.random,
): PathCell[] | null {
  const chars = [...word].map(toCell);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (chars.length === 0 || chars.length > rows * cols) return null;

  const starts = Array.from({ length: SNAKE_STARTS }, () => ({ r: Math.floor(random() * rows), c: Math.floor(random() * cols) }));
  const attempts: Array<() => PathCell[] | null> = [
    ...starts.map((s) => () => snakeFrom(grid, chars, s, random, chars.length >= 3)),
    ...starts.map((s) => () => straightFrom(grid, chars, s, random)),
  ];
  for (const attempt of attempts) {
    const path = attempt();
    if (path) {
      path.forEach((p, i) => { grid[p.r][p.c] = chars[i]; });
      return path;
    }
  }
  return null;
}
