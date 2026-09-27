import { describe, it, expect } from 'vitest';
import { bigPoolSize, pickBigPuzzle } from '../bigPool';
import { isRealCrossword } from '../templates';
import clueBankJson from '../data/clueBank.en.json';
import type { ClueMap } from '../generate.runtime';

const clues = clueBankJson as unknown as ClueMap;
const meta = { id: 'test', locale: 'en' as const, difficulty: 'medium' as const };

describe('the baked newspaper pool', () => {
  /**
   * The Full format has no mini-shaped fallback by design, so an empty pool means every player
   * who picks Full gets the error card. That is a build artefact going missing, which no other
   * test would notice — the pool file would still parse, still typecheck, still import.
   */
  it('is not empty', async () => {
    expect(await bigPoolSize()).toBeGreaterThan(0);
  });

  it('yields a fully-clued 11×11 whose every white cell is checked both ways', async () => {
    const puzzle = await pickBigPuzzle(1, clues, meta);
    expect(puzzle).not.toBeNull();
    expect(puzzle!.size).toBe(11);
    expect(puzzle!.slots.length).toBeGreaterThan(30);
    expect(puzzle!.slots.every((s) => s.clue.length > 0)).toBe(true);

    const solution = Array.from({ length: 11 }, (_, r) =>
      Array.from({ length: 11 }, (_, c) => {
        const cell = puzzle!.cells.find((x) => x.row === r && x.col === c);
        return cell && !cell.block ? cell.solution : null;
      }),
    );
    expect(isRealCrossword(solution, false)).toBe(true);
  });

  it('every answer is 3–5 letters, the only lengths the clue bank holds', async () => {
    const puzzle = await pickBigPuzzle(2, clues, meta);
    for (const slot of puzzle!.slots) {
      expect(slot.answer.length).toBeGreaterThanOrEqual(3);
      expect(slot.answer.length).toBeLessThanOrEqual(5);
    }
  });

  it('gives the same seed the same board, so a daily is stable for everyone', async () => {
    const a = await pickBigPuzzle(42, clues, meta);
    const b = await pickBigPuzzle(42, clues, meta);
    expect(a!.slots.map((s) => s.answer)).toEqual(b!.slots.map((s) => s.answer));
  });

  it('holds no puzzle that repeats an answer within itself', async () => {
    const size = await bigPoolSize();
    for (let seed = 0; seed < size; seed++) {
      const puzzle = await pickBigPuzzle(seed, clues, meta);
      const answers = puzzle!.slots.map((s) => s.answer);
      expect(new Set(answers).size).toBe(answers.length);
    }
  });
});
