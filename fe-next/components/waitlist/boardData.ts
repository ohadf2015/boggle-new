export type Cell = readonly [row: number, col: number];

// Columns run left to right; the traced word moves leftward so it reads right-to-left like Arabic.
export const BOARD: readonly (readonly string[])[] = [
  ['ع', 'ن', 'ر', 'ك'],
  ['م', 'ا', 'ت', 'ل'],
  ['ب', 'س', 'ي', 'و'],
  ['ه', 'د', 'ق', 'ش'],
];

export const TRACE: readonly Cell[] = [
  [0, 3],
  [1, 2],
  [1, 1],
  [2, 0],
];

export function traceWord(): string {
  return TRACE.map(([r, c]) => BOARD[r][c]).join('');
}

export function isAdjacentPath(path: readonly Cell[]): boolean {
  return path.every((cell, i) => {
    if (i === 0) return true;
    const [pr, pc] = path[i - 1];
    const dr = Math.abs(cell[0] - pr);
    const dc = Math.abs(cell[1] - pc);
    return Math.max(dr, dc) === 1;
  });
}

export function traceIndex(row: number, col: number): number {
  return TRACE.findIndex(([r, c]) => r === row && c === col);
}
