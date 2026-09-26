/**
 * MpStandingsBoard: a blank round ("+0 this round") is a QUIET line (DESIGN
 * fun-layer rule: failures are small and low-contrast), a scoring round is not.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MpStandingsBoard } from '../MpStandingsBoard';
import type { MpStandingRow } from '../mpStandings';

vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const row = (over: Partial<MpStandingRow>): MpStandingRow => ({
  username: 'a',
  isMe: false,
  rank: 1,
  score: 0,
  seriesTotal: null,
  seriesDelta: 0,
  ...over,
});

describe('MpStandingsBoard round line', () => {
  it('Given a series ladder, When a row scored 0 this round, Then its round line is quiet and a scoring row is not', () => {
    render(
      <MpStandingsBoard
        rows={[
          row({ username: 'champ', rank: 1, score: 93, roundScore: 15 }),
          row({ username: 'blank', rank: 2, score: 0, roundScore: 0 }),
        ]}
        hiddenCount={0}
        isRevealed={() => true}
        t={t}
      />,
    );
    const [scored, blank] = screen.getAllByTestId('mp-standing-round');
    expect(scored.getAttribute('data-quiet')).toBe('false');
    expect(blank.getAttribute('data-quiet')).toBe('true');
    expect(blank.className).toMatch(/opacity-/);
    expect(scored.className).not.toMatch(/opacity-/);
  });
});

describe('MpStandingsBoard word reel', () => {
  it("Given rows with a best word, Then each row shows its player's word and points; a row without one shows none", () => {
    // Given two rows, one with a best word
    render(
      <MpStandingsBoard
        rows={[
          row({ username: 'champ', rank: 1, score: 40, bestWord: { word: 'gult', score: 23 } }),
          row({ username: 'blank', rank: 2, score: 0, bestWord: null }),
        ]}
        hiddenCount={0}
        isRevealed={() => true}
        t={t}
      />,
    );
    // Then only the scoring row carries the word chip
    const chips = screen.getAllByTestId('mp-standing-best');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain('gult');
    expect(chips[0].textContent).toContain('+23');
    // "+23" never flips to "23+" in Hebrew
    expect(chips[0].querySelector('[dir="ltr"]')?.textContent).toBe('+23');
  });
});
