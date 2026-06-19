import { describe, it, expect } from 'vitest';
import { generatePuzzle, type ClueMap } from './generate.runtime';
import { buildGrid } from './grid';
import clueBankEn from './data/clueBank.en.json';

const EN_CLUES = clueBankEn as unknown as ClueMap;

// Every non-block cell must be part of BOTH an across and a down word (the newspaper "doubly
// checked" rule) — the single strongest "this is a real crossword" invariant.
function everyCellDoublyChecked(puzzle: ReturnType<typeof generatePuzzle>): boolean {
  if (!puzzle) return false;
  const inAcross = new Set<string>();
  const inDown = new Set<string>();
  for (const s of puzzle.slots) {
    const set = s.dir === 'across' ? inAcross : inDown;
    for (const c of s.cells) set.add(`${c.row},${c.col}`);
  }
  return puzzle.cells
    .filter((c) => !c.block)
    .every((c) => inAcross.has(`${c.row},${c.col}`) && inDown.has(`${c.row},${c.col}`));
}

describe('generatePuzzle (runtime crossword generation)', () => {
  it('GIVEN the EN clue bank WHEN generating THEN returns a valid, fully-clued 5x5 puzzle', () => {
    // WHEN
    const puzzle = generatePuzzle({ seed: 1, locale: 'en', clues: EN_CLUES });

    // THEN
    expect(puzzle).not.toBeNull();
    expect(puzzle!.size).toBe(5);
    expect(puzzle!.locale).toBe('en');
    expect(puzzle!.source).toBe('generated');
    expect(puzzle!.slots.length).toBeGreaterThan(0);
    // every slot carries a real clue
    for (const s of puzzle!.slots) {
      expect(s.clue.length).toBeGreaterThan(0);
      expect(s.answer.length).toBe(s.length);
    }
  });

  it('GIVEN a generated puzzle THEN every white cell is checked in both directions', () => {
    const puzzle = generatePuzzle({ seed: 7, locale: 'en', clues: EN_CLUES });
    expect(everyCellDoublyChecked(puzzle)).toBe(true);
  });

  it('GIVEN the same seed WHEN generating twice THEN the puzzles are identical (deterministic)', () => {
    const a = generatePuzzle({ seed: 42, locale: 'en', clues: EN_CLUES });
    const b = generatePuzzle({ seed: 42, locale: 'en', clues: EN_CLUES });
    expect(a).not.toBeNull();
    const sig = (p: typeof a) => p!.cells.map((c) => c.solution || '#').join('');
    expect(sig(a)).toBe(sig(b));
  });

  it('GIVEN different seeds THEN at least some produce different grids (variety)', () => {
    const sigs = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const p = generatePuzzle({ seed, locale: 'en', clues: EN_CLUES });
      if (p) sigs.add(p.cells.map((c) => c.solution || '#').join(''));
    }
    // endless generation must not collapse to one puzzle
    expect(sigs.size).toBeGreaterThan(3);
  });

  it('GIVEN a tiny clue map THEN returns null instead of throwing (graceful failure)', () => {
    const tiny: ClueMap = { cat: { clue: 'Feline', score: 1 }, dog: { clue: 'Canine', score: 1 } };
    const puzzle = generatePuzzle({ seed: 1, locale: 'en', clues: tiny });
    expect(puzzle).toBeNull();
  });

  it('GIVEN a generated puzzle THEN buildGrid round-trips its grid to the same slots', () => {
    const puzzle = generatePuzzle({ seed: 3, locale: 'en', clues: EN_CLUES });
    expect(puzzle).not.toBeNull();
    // grid -> layout -> rebuilt slots should match answers (no off-by-one in cell mapping)
    const solution = Array.from({ length: puzzle!.size }, (_, r) =>
      Array.from({ length: puzzle!.size }, (_, c) => {
        const cell = puzzle!.cells.find((x) => x.row === r && x.col === c)!;
        return cell.block ? null : cell.solution;
      }),
    );
    const rebuilt = buildGrid({ rtl: false, solution });
    const answers = new Set(puzzle!.slots.map((s) => `${s.id}:${s.answer}`));
    for (const s of rebuilt.slots) {
      expect(answers.has(`${s.id}:${s.answer}`)).toBe(true);
    }
  });
});
