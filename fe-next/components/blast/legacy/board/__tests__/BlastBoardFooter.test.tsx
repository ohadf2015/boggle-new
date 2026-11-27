import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlastBoardFooter } from '../BlastBoardFooter';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

const pill = <p data-testid="word-pill" />;

describe('BlastBoardFooter: one slot under the board, never two things stacked', () => {
  it('shows the word pill when no power tile is being explained', () => {
    render(<BlastBoardFooter teaching={null} onDismissTeaching={vi.fn()}>{pill}</BlastBoardFooter>);
    expect(screen.getByTestId('word-pill')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-tile-first-use')).toBeNull();
  });

  it('swaps the pill for the tile card while a power tile is explained, laid out in flow (not floating over the pill)', () => {
    render(<BlastBoardFooter teaching="gold" onDismissTeaching={vi.fn()}>{pill}</BlastBoardFooter>);
    const card = screen.getByTestId('blast-tile-first-use');
    expect(screen.queryByTestId('word-pill')).toBeNull();
    expect(card.parentElement?.className).not.toMatch(/\babsolute\b/);
  });

  it('a word being traced or its score feedback takes the slot back, so no word ever goes unscored', () => {
    render(<BlastBoardFooter teaching="gold" busy onDismissTeaching={vi.fn()}>{pill}</BlastBoardFooter>);
    expect(screen.getByTestId('word-pill')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-tile-first-use')).toBeNull();
  });
});
