import type { BlastLevel, BlastColumn } from '../types';
import { collapseCells } from './collapse';
import { scanFormableThemeWords } from './word-scan';

export type ChainValidation = { ok: true } | { ok: false; reason: string };

/**
 * Replays a chain level forward. At each step exactly one theme word
 * (the next in resolvableOrder) must be formable; clearing it must not
 * skip ahead. After the final word the board must be empty.
 */
export function validateChainLevel(level: BlastLevel): ChainValidation {
  const order = level.resolvableOrder.length ? level.resolvableOrder : level.words;
  let board = level;

  for (let step = 0; step < order.length; step++) {
    const expected = order[step]!;
    const remaining = order.slice(step);
    const matches = scanFormableThemeWords(board, remaining, level.locale);
    const formable = new Set(matches.map((m) => m.word));

    if (!formable.has(expected)) {
      return { ok: false, reason: `step ${step + 1}: expected "${expected}" not formable` };
    }
    if (formable.size > 1) {
      const extra = [...formable].filter((w) => w !== expected);
      return {
        ok: false,
        reason: `step ${step + 1}: words formable out of order: ${extra.join(', ')}`,
      };
    }

    const cells = matches.find((m) => m.word === expected)!.cells;
    board = collapseCells(board, cells).level;
  }

  const leftover = board.columns.reduce(
    (n: number, c: BlastColumn) => n + c.tiles.length,
    0,
  );
  if (leftover > 0) {
    return { ok: false, reason: `leftover ${leftover} tile(s) after final word` };
  }
  return { ok: true };
}
