import { render, screen } from '@testing-library/react';
import { OpponentInsightFeed, maskWord } from '../OpponentInsightFeed';

const mk = (overrides: Partial<Parameters<typeof maskWord>[0] & { score: number; ts: number; byUsername: string }>) => ({
  word: undefined,
  wordLength: overrides.wordLength ?? 5,
  firstLetter: overrides.firstLetter ?? 'F',
  lastLetter: overrides.lastLetter ?? 'G',
  score: overrides.score ?? 5,
  ts: overrides.ts ?? 0,
  byUsername: overrides.byUsername ?? 'X',
});

describe('maskWord', () => {
  it('returns full word when present and length matches', () => {
    expect(maskWord({ word: 'FROG', wordLength: 4, firstLetter: 'F', lastLetter: 'G' })).toBe('FROG');
  });

  it('masks middle when only first/last letter known', () => {
    expect(maskWord({ wordLength: 5, firstLetter: 'F', lastLetter: 'G' })).toBe('F···G');
  });

  it('handles two-letter word with no middle', () => {
    expect(maskWord({ wordLength: 2, firstLetter: 'A', lastLetter: 'B' })).toBe('AB');
  });
});

describe('OpponentInsightFeed', () => {
  it('shows empty state when no opponent words', () => {
    render(<OpponentInsightFeed mode="classic" opponentWords={[]} />);
    expect(screen.getByTestId('opponent-feed-empty')).toBeInTheDocument();
  });

  it('renders most recent words first', () => {
    render(
      <OpponentInsightFeed
        mode="classic"
        opponentWords={[
          mk({ wordLength: 3, firstLetter: 'O', lastLetter: 'D', ts: 1, byUsername: 'A' }),
          mk({ wordLength: 3, firstLetter: 'N', lastLetter: 'W', ts: 100, byUsername: 'B' }),
        ]}
      />
    );
    const rows = screen.getAllByTestId(/opponent-row-/);
    expect(rows[0].getAttribute('data-fresh')).toBe('true');
  });

  it('caps to maxItems', () => {
    const words = Array.from({ length: 10 }, (_, i) => mk({ ts: i, byUsername: 'X', wordLength: i + 2 }));
    render(<OpponentInsightFeed mode="classic" opponentWords={words} maxItems={3} />);
    const rows = screen.getAllByTestId(/opponent-row-/);
    expect(rows.length).toBe(3);
  });
});
