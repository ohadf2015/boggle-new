/**
 * The class sweep was unreachable, which is why nobody has ever photographed it.
 *
 * `classroomSummary` sets `totalWords = canonical.size` — EVERY word in the
 * lesson. The board generator embeds only as many as fit: the server log for a
 * real round reads `Game VHT76G board carries 8/30 lesson words`. The other 22
 * are not on the board, so no child can find them, so `classFoundCount` can
 * never reach `totalWords`.
 *
 * The old test `classFoundCount >= totalWords` therefore could not fire in any
 * round whose board carried a subset — which is every normal round. The sweep
 * meter never burst, the sweep chime never played, and the capture agent was
 * being asked to exercise a state the game cannot produce.
 *
 * A sweep means the class found every lesson word THAT WAS ACTUALLY ON THE
 * BOARD. `neverPlacedWords` is exactly the set to discount, and the server
 * already sends it.
 *
 * When the server does not send it we cannot tell which misses were missable,
 * so the strict old rule stands. Never treat an unknown source as proof — the
 * same rule `neverPlaced` already follows for the missed-word chips.
 */

import { describe, it, expect } from 'vitest';
import { classSwept } from '../roundEndSweep';

describe('classSwept', () => {
  it('is a sweep when the class found every word the board actually carried', () => {
    // 30-word lesson, 8 on the board, all 8 found.
    expect(
      classSwept({ totalWords: 30, classFoundCount: 8, neverPlacedCount: 22 })
    ).toBe(true);
  });

  it('is not a sweep while a word that WAS on the board is still missing', () => {
    expect(
      classSwept({ totalWords: 30, classFoundCount: 7, neverPlacedCount: 22 })
    ).toBe(false);
  });

  it('still sweeps the easy case where the whole lesson fit on the board', () => {
    expect(
      classSwept({ totalWords: 4, classFoundCount: 4, neverPlacedCount: 0 })
    ).toBe(true);
  });

  it('falls back to the strict rule when the server cannot say what was placed', () => {
    // undefined means "we cannot tell", not "nothing was missing".
    expect(
      classSwept({ totalWords: 30, classFoundCount: 8, neverPlacedCount: undefined })
    ).toBe(false);
    expect(
      classSwept({ totalWords: 30, classFoundCount: 30, neverPlacedCount: undefined })
    ).toBe(true);
  });

  it('is never a sweep on an empty lesson', () => {
    expect(classSwept({ totalWords: 0, classFoundCount: 0, neverPlacedCount: 0 })).toBe(false);
  });

  it('is never a sweep when the board carried nothing at all', () => {
    // Every lesson word missing from the board: there was nothing to sweep, so
    // a "you found them all!" burst would be a lie.
    expect(
      classSwept({ totalWords: 30, classFoundCount: 0, neverPlacedCount: 30 })
    ).toBe(false);
  });

  it('does not let a bad count invent a sweep', () => {
    // Defensive: more never-placed than total should not underflow to <= 0 and
    // read as "everything found".
    expect(
      classSwept({ totalWords: 5, classFoundCount: 0, neverPlacedCount: 99 })
    ).toBe(false);
  });
});
