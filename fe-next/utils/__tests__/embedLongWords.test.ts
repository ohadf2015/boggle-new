import { describe, it, expect } from 'vitest';
import { generateRandomTable, isWordOnBoard } from '../utils';
import type { Language } from '@/shared/types/game';

/**
 * Word Hunt needs 5-7 letter target words embeddable on a 4×4 board. The board
 * embedder already has a self-avoiding "snake" DFS placement, but a stale guard
 * (`word.length > Math.max(rows,cols)`) skipped any word longer than the board
 * dimension before the snake path could run. These tests pin the snake capability.
 */
describe('generateRandomTable — long-word (5-7) embedding on 4×4', () => {
  const SAMPLES: Record<string, string[]> = {
    en: ['ACORN', 'BASKET', 'DOLPHIN', 'PLANET', 'GARDEN', 'JOURNEY'],
    sv: ['BLOMMA', 'KANIN', 'STJÄRNA'],
    es: ['CONEJO', 'PLAYA', 'MARIPOSA'.slice(0, 7)],
  };

  for (const [lang, words] of Object.entries(SAMPLES)) {
    for (const w of words) {
      it(`embeds ${lang} "${w}" (${[...w].length} letters) findable on 4×4`, () => {
        // try a few times — placement is randomized
        let found = false;
        for (let i = 0; i < 8 && !found; i++) {
          const board = generateRandomTable(4, 4, lang as Language, [w]);
          if (isWordOnBoard(w, board, lang as Language)) found = true;
        }
        expect(found).toBe(true);
      });
    }
  }

  it('still embeds short straight-line words (regression)', () => {
    let found = false;
    for (let i = 0; i < 8 && !found; i++) {
      const board = generateRandomTable(4, 4, 'en' as Language, ['BAKE']);
      if (isWordOnBoard('BAKE', board, 'en' as Language)) found = true;
    }
    expect(found).toBe(true);
  });
});
