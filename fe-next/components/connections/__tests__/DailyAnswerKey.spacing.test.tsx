import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DailyAnswerKey from '../DailyAnswerKey';
import type { ConnectionPuzzle } from '@/lib/connections/types';

/**
 * Some tiles are phrases, not single words — the shipped pool contains Spanish
 * "del juicio" / "de vinilo" and Hebrew "אל פנים". Rendered with the default
 * wrapping rules, such a tile breaks across two lines mid-phrase, which is what
 * "the boxes split into 2 rows" looks like on the results screen. A phrase must
 * stay on one line; if the row runs out of width it should break BETWEEN the
 * three words instead, where the break carries meaning.
 */
const p = (id: string, word1: string, bridge: string, word2: string): ConnectionPuzzle =>
  ({ id, word1, bridge, word2, hint: '', difficulty: 'medium' }) as unknown as ConnectionPuzzle;

const MULTIWORD = [p('es-1', 'muelas', 'del', 'juicio'), p('he-1', 'פנים', 'אל', 'פנים')];

describe('DailyAnswerKey — revealed answers stay readable', () => {
  it('never breaks a multi-word tile across two lines', () => {
    render(<DailyAnswerKey puzzles={MULTIWORD} solvedIndices={new Set([0])} title="key" />);
    const row = screen.getAllByTestId('answer-key-row')[0];
    const words = [...row.children].filter((c) => c.tagName === 'SPAN');
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.className).toContain('whitespace-nowrap');
    }
  });

  it('breaks between the three words rather than overflowing the row', () => {
    render(<DailyAnswerKey puzzles={MULTIWORD} solvedIndices={new Set([0])} title="key" />);
    const row = screen.getAllByTestId('answer-key-row')[0];
    expect(row.className).toContain('flex-wrap');
  });

  it('separates the three words enough to read as separate words', () => {
    render(<DailyAnswerKey puzzles={MULTIWORD} solvedIndices={new Set([0])} title="key" />);
    const row = screen.getAllByTestId('answer-key-row')[0];
    // gap-1.5 (6px) reads as glued once the tiles are themselves phrases.
    expect(row.className).not.toMatch(/\bgap-1\.5\b/);
    expect(row.className).toMatch(/\bgap-x-2(\.5)?\b/);
  });
});
