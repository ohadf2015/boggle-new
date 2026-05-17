import type { CellId, BlastLevel, TileFlag } from '../types';
import type { LocaleConfig } from '../locale-config';
import { parseCell } from './cell-id';

export type ValidationResult =
  | { kind: 'theme_match'; word: string }
  | { kind: 'bonus'; word: string }
  | { kind: 'reject'; reason: 'length' | 'axis' | 'gap' | 'frozen' | 'duplicate' | 'unknown' };

export type ValidationContext = {
  level: BlastLevel;
  config: LocaleConfig;
  foundWords: Set<string>;
  bonusDict: Set<string>;
  bonusDictEnabled: boolean;
  // Free-form fallback: when present, any normalized candidate (forward or
  // reversed) that the predicate accepts and that wasn't already matched by
  // level.words / bonusDict is treated as a bonus match. Lets players claim
  // any real dictionary word on the board so they can never get stuck.
  dictionaryCheck?: (word: string) => boolean;
};

function checkStraightContiguous(cells: CellId[]): { axis: 'H' | 'V' } | { reject: 'axis' | 'gap' } {
  const ps = cells.map(parseCell);
  const sameCol = ps.every((p) => p.col === ps[0]!.col);
  const sameRow = ps.every((p) => p.row === ps[0]!.row);
  if (!sameCol && !sameRow) return { reject: 'axis' };
  if (sameCol) {
    const rows = ps.map((p) => p.row).sort((a, b) => a - b);
    for (let i = 1; i < rows.length; i++) if (rows[i]! - rows[i - 1]! !== 1) return { reject: 'gap' };
    return { axis: 'V' };
  }
  const cols = ps.map((p) => p.col).sort((a, b) => a - b);
  for (let i = 1; i < cols.length; i++) if (cols[i]! - cols[i - 1]! !== 1) return { reject: 'gap' };
  return { axis: 'H' };
}

function lettersAt(level: BlastLevel, cells: CellId[]): string[] {
  return cells.map((id) => {
    const { col, row } = parseCell(id);
    const colObj = level.columns.find((c) => c.index === col);
    return colObj?.tiles[row] ?? '';
  });
}

function hasFrozenTile(level: BlastLevel, cells: CellId[]): boolean {
  for (const id of cells) {
    const flags: TileFlag[] | undefined = level.tileFlags[id];
    if (flags?.includes('frozen')) return true;
  }
  return false;
}

export function validateSelection(cells: CellId[], ctx: ValidationContext): ValidationResult {
  if (cells.length < 2) return { kind: 'reject', reason: 'length' };
  const axisRes = checkStraightContiguous(cells);
  if ('reject' in axisRes) return { kind: 'reject', reason: axisRes.reject };
  if (hasFrozenTile(ctx.level, cells)) return { kind: 'reject', reason: 'frozen' };
  const letters = lettersAt(ctx.level, cells);
  const forward = ctx.config.normalize(letters.join(''));
  const reversed = ctx.config.normalize(letters.slice().reverse().join(''));
  const normWords = new Set(ctx.level.words.map(ctx.config.normalize));
  const normFound = new Set([...ctx.foundWords].map(ctx.config.normalize));
  for (const candidate of [forward, reversed]) {
    if (normFound.has(candidate)) return { kind: 'reject', reason: 'duplicate' };
    if (normWords.has(candidate)) {
      const original = ctx.level.words.find((w) => ctx.config.normalize(w) === candidate)!;
      return { kind: 'theme_match', word: original };
    }
  }
  if (ctx.bonusDictEnabled) {
    for (const candidate of [forward, reversed]) {
      if (ctx.bonusDict.has(candidate)) return { kind: 'bonus', word: candidate };
    }
  }
  if (ctx.dictionaryCheck) {
    for (const candidate of [forward, reversed]) {
      if (ctx.dictionaryCheck(candidate)) return { kind: 'bonus', word: candidate };
    }
  }
  return { kind: 'reject', reason: 'unknown' };
}
