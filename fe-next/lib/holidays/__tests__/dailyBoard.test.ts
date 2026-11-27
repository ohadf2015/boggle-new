import { describe, expect, it } from 'vitest';
import {
  GELT_CAP_COINS,
  GELT_COINS,
  GIFT_COINS,
  geltCells,
  giftWordFor,
  holidayDailyDay,
  holidayDailyPlan,
  pathThroughCells,
  settleHolidayWords,
  wordThroughCells,
} from '../dailyBoard';

const GRID = [
  ['S', 'N', 'O', 'W'],
  ['A', 'T', 'R', 'E'],
  ['N', 'E', 'E', 'L'],
  ['T', 'A', 'F', 'G'],
];

describe('geltCells', () => {
  it('Given the same date and language, When asked twice, Then it returns the same cells', () => {
    expect(geltCells(GRID, '2026-12-06', 'en', 3)).toEqual(geltCells(GRID, '2026-12-06', 'en', 3));
  });

  it('Given night N, When placing gelt, Then N distinct in-board cells come back', () => {
    const cells = geltCells(GRID, '2026-12-07', 'en', 4);
    expect(cells).toHaveLength(4);
    expect(new Set(cells.map((c) => `${c.row}-${c.col}`)).size).toBe(4);
    for (const c of cells) {
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(4);
      expect(c.col).toBeLessThan(4);
    }
  });

  it('Given a bigger night, When placing gelt, Then earlier nights stay lit (menorah grows)', () => {
    const three = geltCells(GRID, '2026-12-06', 'en', 3);
    const five = geltCells(GRID, '2026-12-06', 'en', 5);
    expect(five.slice(0, 3)).toEqual(three);
  });

  it('Given more gelt than cells, When placing, Then it caps at the board size', () => {
    expect(geltCells([['A', 'B']], '2026-12-06', 'en', 8)).toHaveLength(2);
  });
});

describe('wordThroughCells', () => {
  it('Given a word whose only path crosses a marked cell, Then it is true', () => {
    expect(wordThroughCells('SNOW', GRID, [{ row: 0, col: 2 }])).toBe(true);
  });

  it('Given a word on the board that avoids the marked cells, Then it is false', () => {
    expect(wordThroughCells('SNOW', GRID, [{ row: 3, col: 3 }])).toBe(false);
  });

  it('Given a word not on the board, Then it is false', () => {
    expect(wordThroughCells('ZEBRA', GRID, [{ row: 0, col: 0 }])).toBe(false);
  });

  it('Given lowercase input and a Hebrew final letter, Then it matches the stored grid form', () => {
    expect(wordThroughCells('snow', GRID, [{ row: 0, col: 0 }])).toBe(true);
    expect(wordThroughCells('נר', [['נ', 'ר']], [{ row: 0, col: 1 }])).toBe(true);
    expect(wordThroughCells('אמן', [['א', 'מ', 'נ']], [{ row: 0, col: 2 }])).toBe(true);
  });
});

describe('giftWordFor', () => {
  it('Given a board holding a themed word, Then that word is the gift', () => {
    expect(['SNOW', 'TREE', 'NOEL', 'ELF', 'STAR']).toContain(giftWordFor(GRID, '2026-12-14', 'en'));
  });

  it('Given a board with no themed word, Then there is no gift', () => {
    expect(giftWordFor([['Q', 'X'], ['Z', 'J']], '2026-12-14', 'en')).toBeNull();
  });

  it('Given a language without a gift list, Then there is no gift', () => {
    expect(giftWordFor(GRID, '2026-12-14', 'ja')).toBeNull();
  });
});

describe('holidayDailyPlan', () => {
  it('Given Hanukkah night 3, Then the plan is a Nightly Board with 3 gelt tiles', () => {
    const plan = holidayDailyPlan({ holiday: 'hanukkah', puzzleDate: '2026-12-06', language: 'en', grid: GRID });
    expect(plan).toMatchObject({ kind: 'nightly', holiday: 'hanukkah', day: 3 });
    expect(plan?.kind === 'nightly' && plan.gelt).toHaveLength(3);
  });

  it('Given the morning after night 8, Then all 8 gelt stay lit', () => {
    const plan = holidayDailyPlan({ holiday: 'hanukkah', puzzleDate: '2026-12-12', language: 'en', grid: GRID });
    expect(plan?.kind === 'nightly' && plan.gelt).toHaveLength(8);
  });

  it('Given an Advent day with a themed word, Then the plan hides that word and its length', () => {
    const plan = holidayDailyPlan({ holiday: 'christmas', puzzleDate: '2026-12-16', language: 'en', grid: GRID });
    expect(plan).toMatchObject({ kind: 'advent', day: 3 });
    expect(plan?.kind === 'advent' && plan.giftLength).toBe(plan?.kind === 'advent' ? plan.giftWord.length : -1);
  });

  it('Given a date outside the holiday window, Then there is no plan', () => {
    expect(holidayDailyPlan({ holiday: 'hanukkah', puzzleDate: '2026-11-27', language: 'en', grid: GRID })).toBeNull();
    expect(holidayDailyPlan({ holiday: 'christmas', puzzleDate: '2026-12-01', language: 'en', grid: GRID })).toBeNull();
  });

  it('Given Advent with no gift on the board, Then there is no plan', () => {
    expect(holidayDailyPlan({ holiday: 'christmas', puzzleDate: '2026-12-16', language: 'en', grid: [['Q']] })).toBeNull();
  });
});

describe('settleHolidayWords', () => {
  it('Given words through gelt, Then each pays gelt once and the total is capped', () => {
    const plan = { kind: 'nightly' as const, holiday: 'hanukkah' as const, day: 8, gelt: [{ row: 0, col: 0 }] };
    const r = settleHolidayWords(plan, GRID, ['SNOW', 'snow', 'SAT', 'TREE']);
    expect(r.geltWords).toEqual(['SNOW', 'SAT']);
    expect(r.coins).toBe(2 * GELT_COINS);
    const everywhere = { ...plan, gelt: GRID.flatMap((row, r) => row.map((_, c) => ({ row: r, col: c }))) };
    const many = ['SNOW', 'SAT', 'TREE', 'TEN', 'NET', 'ANT', 'EEL', 'TAN', 'ATE', 'EAT', 'TEA', 'NOW', 'ROW', 'TORE'];
    expect(settleHolidayWords(everywhere, GRID, many).coins).toBe(GELT_CAP_COINS);
  });

  it('Given the gift word among found words, Then the gift unwraps for the big reward', () => {
    const plan = { kind: 'advent' as const, holiday: 'christmas' as const, day: 1, giftWord: 'TREE', giftLength: 4 };
    expect(settleHolidayWords(plan, GRID, ['tree'])).toMatchObject({ giftFound: true, coins: GIFT_COINS });
    expect(settleHolidayWords(plan, GRID, ['SNOW'])).toMatchObject({ giftFound: false, coins: 0 });
  });
});

describe('pathThroughCells', () => {
  it('Given a word through a gelt tile, Then the traced path is returned cell by cell', () => {
    expect(pathThroughCells('SNOW', GRID, [{ row: 0, col: 3 }])).toEqual([
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
    ]);
    expect(pathThroughCells('SNOW', GRID, [{ row: 3, col: 3 }])).toBeNull();
  });
});

describe('holidayDailyDay', () => {
  it('Given a date, Then it names the night or gift number without needing the board', () => {
    expect(holidayDailyDay('hanukkah', '2026-12-04', 'he')).toBe(1);
    expect(holidayDailyDay('christmas', '2026-12-25', 'en')).toBe(12);
    expect(holidayDailyDay('christmas', '2026-12-25', 'ja')).toBeNull();
    expect(holidayDailyDay('christmas', '2026-12-28', 'en')).toBeNull();
  });
});
