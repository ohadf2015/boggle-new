import { describe, it, expect } from 'vitest';
import {
  nextHintStage,
  firstCellOf,
  HINT_NUDGE_MS,
  HINT_REVEAL_MS,
} from '../practiceHint';

describe('nextHintStage', () => {
  it('shows nothing while the player is active or just arrived', () => {
    expect(nextHintStage({ idleMs: 0, drags: 0, wordsFound: 0 })).toBe('none');
    expect(nextHintStage({ idleMs: 3000, drags: 0, wordsFound: 0 })).toBe('none');
  });

  it('nudges after idle with no drag attempts', () => {
    expect(nextHintStage({ idleMs: HINT_NUDGE_MS, drags: 0, wordsFound: 0 })).toBe('nudge');
  });

  it('does NOT nudge if the player has already dragged (they get it)', () => {
    expect(nextHintStage({ idleMs: HINT_NUDGE_MS, drags: 2, wordsFound: 0 })).toBe('none');
  });

  it('reveals a tile after long idle even if they have been dragging (stuck)', () => {
    expect(
      nextHintStage({ idleMs: HINT_REVEAL_MS, drags: 5, wordsFound: 0, hasTarget: true }),
    ).toBe('reveal-tile');
  });

  it('never promises a tile reveal when there is no riddle target (sv/ja/es)', () => {
    // No glowing tile exists, so we must NOT escalate to reveal copy.
    expect(
      nextHintStage({ idleMs: HINT_REVEAL_MS, drags: 5, wordsFound: 0, hasTarget: false }),
    ).not.toBe('reveal-tile');
    // A player who never dragged still gets the nudge.
    expect(
      nextHintStage({ idleMs: HINT_REVEAL_MS, drags: 0, wordsFound: 0, hasTarget: false }),
    ).toBe('nudge');
  });

  it('stops helping once any word is found', () => {
    expect(
      nextHintStage({ idleMs: HINT_REVEAL_MS, drags: 0, wordsFound: 1, hasTarget: true }),
    ).toBe('none');
  });
});

describe('firstCellOf', () => {
  const grid = [
    ['S', 'T', 'X', 'X'],
    ['X', 'A', 'R', 'X'],
    ['X', 'X', 'X', 'X'],
    ['X', 'X', 'X', 'X'],
  ];

  it('returns the starting cell of a traceable word', () => {
    // STAR: S(0,0) -> T(0,1) -> A(1,1) -> R(1,2), all 8-adjacent
    expect(firstCellOf('STAR', grid, 'en')).toEqual({ row: 0, col: 0 });
  });

  it('is case-insensitive', () => {
    expect(firstCellOf('star', grid, 'en')).toEqual({ row: 0, col: 0 });
  });

  it('returns null when the word is not on the board', () => {
    expect(firstCellOf('ZEBRA', grid, 'en')).toBeNull();
  });

  it('finds Hebrew words', () => {
    const he = [
      ['ר', 'ו', 'X', 'X'],
      ['X', 'פ', 'א', 'X'],
      ['X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X'],
    ];
    // רופא: ר(0,0)->ו(0,1)->פ(1,1)->א(1,2)
    expect(firstCellOf('רופא', he, 'he')).toEqual({ row: 0, col: 0 });
  });
});
