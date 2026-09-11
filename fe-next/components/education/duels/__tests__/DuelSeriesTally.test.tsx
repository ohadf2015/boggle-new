import { render, screen } from '@testing-library/react';
import { DuelSeriesTally } from '../DuelSeriesTally';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, _f?: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
    language: 'en',
  }),
}));

describe('DuelSeriesTally', () => {
  it('shows three pips for a best-of-three', () => {
    render(<DuelSeriesTally series={{ mine: 0, theirs: 0, games: 0 }} status="open" />);
    expect(screen.getAllByTestId('duel-series-pip')).toHaveLength(3);
  });

  it('marks every game that has been played and leaves the rest pending', () => {
    render(<DuelSeriesTally series={{ mine: 1, theirs: 1, games: 2 }} status="open" />);

    const pips = screen.getAllByTestId('duel-series-pip');
    expect(pips[0]).toHaveAttribute('data-result', 'win');
    expect(pips[1]).toHaveAttribute('data-result', 'loss');
    expect(pips[2]).toHaveAttribute('data-result', 'pending');
  });

  it('shows a drawn game as a draw, not as a win for either side', () => {
    render(<DuelSeriesTally series={{ mine: 0, theirs: 0, games: 1 }} status="open" />);

    const pips = screen.getAllByTestId('duel-series-pip');
    expect(pips[0]).toHaveAttribute('data-result', 'draw');
  });

  it('announces the next game number while the series is open', () => {
    render(<DuelSeriesTally series={{ mine: 1, theirs: 0, games: 1 }} status="open" />);
    expect(screen.getByTestId('duel-series-label')).toHaveTextContent('2');
  });

  it('declares the series result once it is decided', () => {
    const { rerender } = render(
      <DuelSeriesTally series={{ mine: 2, theirs: 0, games: 2 }} status="won" />
    );
    expect(screen.getByTestId('duel-series-label')).toHaveTextContent('seriesWon');

    rerender(<DuelSeriesTally series={{ mine: 0, theirs: 2, games: 2 }} status="lost" />);
    expect(screen.getByTestId('duel-series-label')).toHaveTextContent('seriesLost');
  });
});
