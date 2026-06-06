// Pure grid model: turn a solution layout into numbered cells + across/down slots.
//
// Geometry is LOGICAL and direction-agnostic: across always reads left-to-right in array order,
// down top-to-bottom, numbering from the top-left. RTL (Hebrew) is a DISPLAY concern handled by
// the renderer (columns are mirrored via CSS so logical col 0 appears on the right and across
// reads right-to-left visually). Keeping answers in authored reading order means clue-keys match
// and Hebrew puzzles are authored naturally. See docs/2026-06-06-crossword-mode-spec.md.

import type { BuiltGrid, Cell, GridLayout, Slot } from './types';

function isLetter(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.length > 0;
}

/** Build numbered cells + slots from a solution layout. */
export function buildGrid(layout: GridLayout): BuiltGrid {
  const { solution } = layout;
  const size = solution.length;
  const at = (r: number, c: number): string | null =>
    r >= 0 && r < size && c >= 0 && c < size ? (solution[r]?.[c] ?? null) : null;

  const startsAcross = (r: number, c: number): boolean =>
    isLetter(at(r, c)) && !isLetter(at(r, c - 1)) && isLetter(at(r, c + 1));
  const startsDown = (r: number, c: number): boolean =>
    isLetter(at(r, c)) && !isLetter(at(r - 1, c)) && isLetter(at(r + 1, c));

  // Assign numbers in top-left reading order (row-major, columns ascending).
  const numberAt = new Map<string, number>();
  let n = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (startsAcross(r, c) || startsDown(r, c)) {
        n += 1;
        numberAt.set(`${r},${c}`, n);
      }
    }
  }

  const cells: Cell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const letter = at(r, c);
      cells.push({
        row: r,
        col: c,
        block: !isLetter(letter),
        solution: isLetter(letter) ? letter : '',
        number: numberAt.get(`${r},${c}`) ?? null,
      });
    }
  }

  const slots: Slot[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (startsAcross(r, c)) {
        const number = numberAt.get(`${r},${c}`)!;
        const runCells: Array<{ row: number; col: number }> = [];
        let cc = c;
        while (isLetter(at(r, cc))) {
          runCells.push({ row: r, col: cc });
          cc += 1;
        }
        slots.push({
          id: `A${number}`,
          dir: 'across',
          number,
          row: r,
          col: c,
          length: runCells.length,
          cells: runCells,
          answer: runCells.map((x) => at(x.row, x.col)!).join(''),
          clue: '',
        });
      }
      if (startsDown(r, c)) {
        const number = numberAt.get(`${r},${c}`)!;
        const runCells: Array<{ row: number; col: number }> = [];
        let rr = r;
        while (isLetter(at(rr, c))) {
          runCells.push({ row: rr, col: c });
          rr += 1;
        }
        slots.push({
          id: `D${number}`,
          dir: 'down',
          number,
          row: r,
          col: c,
          length: runCells.length,
          cells: runCells,
          answer: runCells.map((x) => at(x.row, x.col)!).join(''),
          clue: '',
        });
      }
    }
  }

  // Stable order: by number, across before down.
  slots.sort((a, b) => a.number - b.number || (a.dir === b.dir ? 0 : a.dir === 'across' ? -1 : 1));

  return { size, cells, slots };
}
