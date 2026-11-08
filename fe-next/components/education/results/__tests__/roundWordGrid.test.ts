import { describe, it, expect } from 'vitest';
import { buildRoundWordGrid } from '../roundWordGrid';

describe('buildRoundWordGrid', () => {
  it('Given this round\'s coverage, When built, Then each student is a column and each lesson word a row, worst word first', () => {
    const grid = buildRoundWordGrid({
      gameMode: 'classic',
      coverage: [
        { word: 'castle', foundBy: ['Maya', 'Noam'] },
        { word: 'bridge', foundBy: [] },
        { word: 'river', foundBy: ['Maya'] },
      ],
      masteryByPlayer: { Maya: { found: 2, total: 3 }, Noam: { found: 1, total: 3 } },
    });
    expect(grid.columns.map((c) => c.name)).toEqual(['Maya', 'Noam']);
    expect(grid.rows.map((r) => r.word)).toEqual(['bridge', 'river', 'castle']);
    const river = grid.rows.find((r) => r.word === 'river')!;
    expect(river.cells).toEqual(['found', 'missed']);
    expect(grid.columns.find((c) => c.name === 'Maya')!.accuracyPct).toBe(67);
  });

  it('Given a vocab quiz round, When built, Then the grid uses quiz wording', () => {
    const grid = buildRoundWordGrid({ gameMode: 'vocab-quiz', coverage: [{ word: 'a', foundBy: ['X'] }], masteryByPlayer: { X: { found: 1, total: 1 } } });
    expect(grid.stateLabelKind).toBe('quiz');
  });

  it('Given an old summary with no coverage or players, When built, Then the grid is empty rather than broken', () => {
    const grid = buildRoundWordGrid({ gameMode: 'classic', coverage: undefined as never, masteryByPlayer: undefined as never });
    expect(grid.rows).toEqual([]);
    expect(grid.columns).toEqual([]);
  });

  it('Given a word whose finder is not in the mastery map, When built, Then that finder still gets a column', () => {
    const grid = buildRoundWordGrid({ gameMode: 'classic', coverage: [{ word: 'cat', foundBy: ['Late'] }], masteryByPlayer: {} });
    expect(grid.columns.map((c) => c.name)).toEqual(['Late']);
    expect(grid.rows[0].cells).toEqual(['found']);
  });

  it('Given the teacher played a practice seat, When built, Then the host is not a student column', () => {
    const grid = buildRoundWordGrid({
      gameMode: 'classic',
      hostName: 'Ms Dana',
      coverage: [{ word: 'cat', foundBy: ['ms dana', 'Noa'] }],
      masteryByPlayer: { 'Ms Dana': { found: 1, total: 1 }, Noa: { found: 1, total: 1 } },
    });
    expect(grid.columns.map((c) => c.name)).toEqual(['Noa']);
  });
});
