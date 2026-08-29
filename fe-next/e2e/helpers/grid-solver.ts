import { type Page } from '@playwright/test';

/** A single board cell as rendered in the DOM (`[role="gridcell"]`) */
export interface GridCellInfo {
  row: number;
  col: number;
  letter: string;
}

export interface SolvedWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

/** Read the rendered grid's cells (row/col/letter) from the DOM */
export async function readGrid(page: Page): Promise<GridCellInfo[]> {
  const cells = await page.locator('[role="gridcell"]').evaluateAll((els) =>
    els.map((el) => ({
      row: Number(el.getAttribute('data-row')),
      col: Number(el.getAttribute('data-col')),
      letter: el.getAttribute('data-letter') || '',
    }))
  );
  return cells.filter((c) => c.letter.length > 0);
}

/** Convert a flat cell list into a 2D letter array indexed [row][col] */
export function toGridArray(cells: GridCellInfo[]): string[][] {
  const rows = Math.max(...cells.map((c) => c.row)) + 1;
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''));
  for (const cell of cells) {
    grid[cell.row][cell.col] = cell.letter;
  }
  return grid;
}

/** Ask the same-origin solver for real, board-verified words (`POST /api/solve-grid`) */
export async function solveGrid(
  baseURL: string,
  grid: string[][],
  language = 'en'
): Promise<SolvedWords> {
  const res = await fetch(`${baseURL}/api/solve-grid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grid, language }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`solve-grid failed: ${data.error || 'unknown error'}`);
  }
  return data.words as SolvedWords;
}

/** 8-directional adjacency — matches the client's boggle path rules */
function isAdjacent(a: GridCellInfo, b: GridCellInfo): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

/** Find an ordered cell path spelling `word` on the board, or null if none exists */
export function findWordPath(cells: GridCellInfo[], word: string): GridCellInfo[] | null {
  const target = word.toLowerCase();

  function dfs(path: GridCellInfo[], remaining: string): GridCellInfo[] | null {
    if (remaining.length === 0) return path;
    const nextLetter = remaining[0];
    const candidates = path.length === 0 ? cells : cells.filter((c) => isAdjacent(path[path.length - 1], c));

    for (const candidate of candidates) {
      if (path.includes(candidate)) continue;
      if (candidate.letter.toLowerCase() !== nextLetter) continue;
      const result = dfs([...path, candidate], remaining.slice(1));
      if (result) return result;
    }
    return null;
  }

  return dfs([], target);
}

/** Drag the mouse across an ordered cell path, replicating the board's drag-to-submit gesture */
export async function dragSubmitWord(page: Page, path: GridCellInfo[]): Promise<void> {
  const centers = await Promise.all(
    path.map(async (cell) => {
      const box = await page
        .locator(`[role="gridcell"][data-row="${cell.row}"][data-col="${cell.col}"]`)
        .boundingBox();
      if (!box) throw new Error(`Cell (${cell.row},${cell.col}) has no bounding box`);
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    })
  );

  await page.mouse.move(centers[0].x, centers[0].y);
  await page.mouse.down();
  for (const center of centers.slice(1)) {
    await page.mouse.move(center.x, center.y, { steps: 5 });
  }
  await page.mouse.up();
}

/** Read the board, ask the solver for a real word, and submit it via a drag gesture. Returns the word. */
export async function submitRealWord(page: Page, baseURL: string, language = 'en'): Promise<string> {
  const cells = await readGrid(page);
  const grid = toGridArray(cells);
  const solved = await solveGrid(baseURL, grid, language);
  const word = solved.easy[0] || solved.medium[0] || solved.hard[0];
  if (!word) throw new Error('solve-grid found no submittable word for this board');

  const path = findWordPath(cells, word);
  if (!path) throw new Error(`Could not derive a cell path for word "${word}"`);

  await dragSubmitWord(page, path);
  return word;
}
