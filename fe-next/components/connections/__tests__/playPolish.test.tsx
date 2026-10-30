import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BridgeCelebration, { praiseKey } from '../BridgeCelebration';
import { PuzzleResolution } from '../PuzzleActions';
import DailyHeader from '../DailyHeader';
import { rankFor } from '@/lib/connections/progress';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireLevelUpConfetti: vi.fn() }));

describe('BridgeCelebration', () => {
  it('praise climbs with the streak and caps at the top word', () => {
    expect([0, 1, 2, 3, 4, 9].map(praiseKey)).toEqual([
      'connections.praise1',
      'connections.praise1',
      'connections.praise2',
      'connections.praise3',
      'connections.praise4',
      'connections.praise4',
    ]);
  });

  it('shows the points this solve added, and hides the chip at zero', () => {
    const { rerender } = render(<BridgeCelebration streak={3} points={150} />);
    expect(screen.getByText('connections.praise3')).toBeInTheDocument();
    expect(screen.getByText('+150')).toBeInTheDocument();
    rerender(<BridgeCelebration streak={1} points={0} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});

describe('PuzzleResolution', () => {
  it('Enter on a physical keyboard moves to the next riddle', () => {
    const onNext = vi.fn();
    render(<PuzzleResolution hasRated={false} showRating onRate={vi.fn()} onNext={onNext} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('ignores a held-down Enter so the submitting keypress cannot skip the payoff', () => {
    const onNext = vi.fn();
    render(<PuzzleResolution hasRated={false} showRating onRate={vi.fn()} onNext={onNext} />);
    fireEvent.keyDown(window, { key: 'Enter', repeat: true });
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe('DailyHeader', () => {
  it('keeps the riddle counter left-to-right in Hebrew ("4 / 5", never "5 / 4")', () => {
    render(
      <DailyHeader
        score={350}
        currentIndex={3}
        total={5}
        attemptsLeft={4}
        solvedIndices={new Set([0, 1, 2])}
        difficulties={['easy', 'easy', 'medium', 'medium', 'hard']}
        standing={rankFor(12)}
        rankUpId={null}
        onRankUpShown={vi.fn()}
      />,
    );
    const progress = screen.getByTestId('daily-progress');
    expect(progress).toHaveTextContent('4 / 5');
    expect(progress.closest('[dir]')?.getAttribute('dir')).toBe('ltr');
  });
});
