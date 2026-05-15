import { coordsOf, type CascadeGrid } from './boardGrid';

export type SwipePathError =
  | 'TOO_SHORT'
  | 'NOT_CONTIGUOUS'
  | 'REUSED_CELL'
  | 'UNKNOWN_CELL'
  | 'EMPTY_CELL';

export type SwipePathResult =
  | { ok: true; word: string; path: string[] }
  | { ok: false; reason: SwipePathError };

export interface ValidatePathOpts {
  diagonal?: boolean;
  minLength?: number;
}

const DEFAULT_MIN = 3;

export function validatePath(
  grid: CascadeGrid,
  path: ReadonlyArray<string>,
  opts: ValidatePathOpts = {}
): SwipePathResult {
  const min = opts.minLength ?? DEFAULT_MIN;
  if (path.length < min) return { ok: false, reason: 'TOO_SHORT' };

  const seen = new Set<string>();
  const coords: Array<{ row: number; col: number }> = [];
  for (const id of path) {
    if (seen.has(id)) return { ok: false, reason: 'REUSED_CELL' };
    const c = coordsOf(grid, id);
    if (!c) return { ok: false, reason: 'UNKNOWN_CELL' };
    seen.add(id);
    coords.push(c);
  }

  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    if (dr === 0 && dc === 0) {
      // Same cell — handled by REUSED_CELL above; defensive
      return { ok: false, reason: 'NOT_CONTIGUOUS' };
    }
    const maxStep = opts.diagonal ? 1 : 1;
    if (dr > maxStep || dc > maxStep) return { ok: false, reason: 'NOT_CONTIGUOUS' };
    if (!opts.diagonal && dr + dc !== 1) return { ok: false, reason: 'NOT_CONTIGUOUS' };
  }

  const letters: string[] = [];
  for (const id of path) {
    const i = grid.index.get(id);
    if (i === undefined) return { ok: false, reason: 'UNKNOWN_CELL' };
    const letter = grid.cells[i].letter;
    if (letter === null) return { ok: false, reason: 'EMPTY_CELL' };
    letters.push(letter);
  }
  const word = letters.join('');

  return { ok: true, word, path: [...path] };
}
