import type { BlastLevel } from '../types';
import { LOCALE_CONFIGS, type LocaleConfig } from '../locale-config';

/**
 * Shortest run of tiles that counts as a word on the board — for the generator's
 * unintended-word screen AND for the player's bonus-word claim. These MUST be the
 * same number: screening at 4 while accepting selections at 2 means the screen
 * never sees the words the player can actually clear. Measured on the shipped
 * en chain pack, unintended selectable words per board state:
 *   min length 2 → 28 avg (85 worst) · 3 → 12 avg · 4 → 3 avg · 5 → 0.3 avg
 * At 2 the intended word is one option among thirty, and every stray clear
 * collapses the board out from under the authored chain.
 *
 * The rule is: one tile longer than the locale's shortest theme word, capped at
 * 4, and never longer than its longest word.
 *   - en/he/sv/es (min 3) → 4. 3-letter hits dominate the false positives
 *     (especially Hebrew, where most 3-letter substrings are real roots) and
 *     over-constrain placement to unsolvability.
 *   - ja (min 2, max 4) → 3. A flat 4 would make a bonus word exactly as long
 *     as the LONGEST possible Japanese theme word, which effectively deletes
 *     the mechanic for that locale.
 * Theme words are exempt — the level's own answers are matched before this
 * floor applies, so a short answer still clears.
 */
export const BOARD_WORD_MIN_LENGTH_FLOOR = 4;

export function boardWordMinLength(config: LocaleConfig): number {
  const { min, max } = config.wordLengthRange;
  return Math.min(BOARD_WORD_MIN_LENGTH_FLOOR, min + 1, max);
}

/**
 * Scans every horizontal and vertical contiguous line segment of the board
 * (length >= minLength, both reading directions) and returns any segment that
 * forms a real dictionary word NOT present in level.words.
 * Dictionary injected as a predicate so this stays pure and testable.
 */
export function findExtraWords(
  level: BlastLevel,
  isWord: (word: string) => boolean,
  minLength: number,
): string[] {
  const config = LOCALE_CONFIGS[level.locale];
  const norm = (s: string) => config.normalize(s);
  const intended = new Set(level.words.map(norm));

  const grid = new Map<string, string>();
  let maxRow = 0;
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) {
      grid.set(`${col.index},${r}`, col.tiles[r]!);
      if (r > maxRow) maxRow = r;
    }
  }
  const cols = level.columns.map((c) => c.index);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const found = new Set<string>();
  const consider = (s: string) => {
    if (s.length < minLength) return;
    for (const candidate of [s, [...s].reverse().join('')]) {
      const n = norm(candidate);
      if (intended.has(n)) continue;
      if (isWord(candidate)) found.add(candidate);
    }
  };

  // Horizontal scans: for each row, scan across columns
  for (let r = 0; r <= maxRow; r++) {
    let run = '';
    for (let c = minCol; c <= maxCol; c++) {
      const cell = grid.get(`${c},${r}`);
      if (cell) {
        run += cell;
      } else {
        emitSubsegments(run, minLength, consider);
        run = '';
      }
    }
    emitSubsegments(run, minLength, consider);
  }

  // Vertical scans: for each column, scan tiles (bottom to top)
  for (const col of level.columns) {
    emitSubsegments(col.tiles.join(''), minLength, consider);
  }

  return [...found];
}

function emitSubsegments(
  run: string,
  minLength: number,
  consider: (s: string) => void,
): void {
  if (run.length < minLength) return;
  for (let start = 0; start < run.length; start++) {
    for (let end = start + minLength; end <= run.length; end++) {
      consider(run.slice(start, end));
    }
  }
}
