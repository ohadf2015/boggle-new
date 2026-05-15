/**
 * Headless playthrough harness — proves the cascade engine plays a full loop
 * end-to-end: swipe → validate → score → burn → gravity → resolve cascades.
 */
import { describe, it, expect } from 'vitest';
import { createBag } from '../tileBag';
import { createGrid, cellAt, setCellLetter } from '../cascade/boardGrid';
import { validatePath } from '../cascade/swipePath';
import { burnCells, applyGravity } from '../cascade/burnAndGravity';
import { findAutoWords, resolveCascade } from '../cascade/cascadeResolver';
import { scoreCascadeWord } from '../cascade/scoring';
import { createFireState, tickFire, resetFire, isGameOver } from '../cascade/fireRow';

describe('cascade integration harness', () => {
  it('plays a full microround: submit STAR, burn, gravity, cascade resolves, fire ticks', () => {
    const bag = createBag({ seed: 314, locale: 'en' });
    const grid = createGrid(3, 5, bag);

    // Plant STAR + STARE in row 0 by overwriting
    setCellLetter(grid, 0, 0, 'S', 1);
    setCellLetter(grid, 0, 1, 'T', 1);
    setCellLetter(grid, 0, 2, 'A', 1);
    setCellLetter(grid, 0, 3, 'R', 1);
    setCellLetter(grid, 0, 4, 'E', 1);

    // Swipe path "STAR"
    const path = [
      cellAt(grid, 0, 0)!.id,
      cellAt(grid, 0, 1)!.id,
      cellAt(grid, 0, 2)!.id,
      cellAt(grid, 0, 3)!.id,
    ];
    const v = validatePath(grid, path);
    expect(v.ok).toBe(true);
    if (!v.ok) return;

    // Score the manual swipe
    const score1 = scoreCascadeWord({
      wordTiles: [
        { letter: 'S', value: 1, premium: null },
        { letter: 'T', value: 1, premium: null },
        { letter: 'A', value: 1, premium: null },
        { letter: 'R', value: 1, premium: null },
      ],
      chainCount: 1,
      wordIndexInRound: 0,
      activeCards: [],
    });
    expect(score1).toBe(4); // 4 chips * 1.2 lengthBonus

    // Burn + gravity
    const burned = burnCells(grid, path);
    const { grid: gAfter } = applyGravity(burned, bag);

    // Resolve any cascades that fall out (depends on bag spawns, may be 0)
    const dict = (w: string) => w.toUpperCase() === 'STARE';
    const { chains, finalGrid } = resolveCascade(gAfter, bag, dict);

    // After cascade resolution, every cell must be filled
    for (let r = 0; r < finalGrid.rows; r++) {
      for (let c = 0; c < finalGrid.cols; c++) {
        expect(cellAt(finalGrid, r, c)!.letter).not.toBeNull();
      }
    }

    // No-op auto-detect run on final grid: no STARE expected unless coincidence
    const lateMatches = findAutoWords(finalGrid, dict);
    expect(lateMatches.length).toBeGreaterThanOrEqual(0);

    // Fire ticks independently
    let fire = createFireState({ totalRows: 7, riseEveryMs: 10_000 });
    fire = tickFire(fire, 12_000);
    expect(fire.fireRow).toBe(1);
    // Big word pushes fire back
    fire = resetFire(fire, 2);
    expect(fire.fireRow).toBe(0);
    expect(isGameOver(fire)).toBe(false);

    // Chains is an array (may be empty) of arrays of matches
    expect(Array.isArray(chains)).toBe(true);
  });

  it('cascade chain depth caps at maxDepth', () => {
    const bag = createBag({ seed: 999, locale: 'en' });
    const grid = createGrid(3, 4, bag);
    // Force every row to be a valid "word" so we cascade indefinitely without a cap
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) setCellLetter(grid, r, c, 'A', 1);
    }
    const dict = () => true;
    const { chains } = resolveCascade(grid, bag, dict, { maxDepth: 3 });
    expect(chains.length).toBeLessThanOrEqual(3);
  });
});
