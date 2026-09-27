// Invariants the generated EN puzzle bank must satisfy. These are the gates the prior
// (rejected) attempts lacked at the CLUE level: every answer must carry a real clue, and
// the bank must bias toward common (high-frequency) words. Structural validity is checked
// by quality.test.ts; this file guards clue coverage + commonness.

import { describe, it, expect } from 'vitest';
import generated from './data/puzzles.en.json';
import { hasClue, getClue, clueScore } from './clueBank';
import { buildGrid } from './grid';

interface GenPuzzle {
  id: string;
  locale: string;
  difficulty: string;
  rtl: boolean;
  grid: (string | null)[][];
  clues: Record<string, string>;
}

const puzzles = generated as GenPuzzle[];

describe('generated EN puzzle bank', () => {
  it('has a meaningful number of puzzles', () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(40);
  });

  it('every slot answer has a real clue, and the clue matches the bank', () => {
    for (const p of puzzles) {
      const { slots } = buildGrid({ rtl: p.rtl, solution: p.grid });
      for (const s of slots) {
        expect(hasClue(s.answer), `${p.id} ${s.id}=${s.answer} missing clue`).toBe(true);
        expect(p.clues[s.id]).toBe(getClue(s.answer));
      }
    }
  });

  it('biases toward common words (avg answer frequency above floor)', () => {
    let total = 0;
    let n = 0;
    for (const p of puzzles) {
      const { slots } = buildGrid({ rtl: p.rtl, solution: p.grid });
      for (const s of slots) {
        total += clueScore(s.answer);
        n++;
      }
    }
    const avg = total / n;
    expect(avg).toBeGreaterThan(50000); // Datamuse score floor; common words score high
  });

  it('tiers difficulty into easy/medium/hard', () => {
    const tiers = new Set(puzzles.map((p) => p.difficulty));
    expect(tiers.size).toBeGreaterThanOrEqual(2);
  });
});
