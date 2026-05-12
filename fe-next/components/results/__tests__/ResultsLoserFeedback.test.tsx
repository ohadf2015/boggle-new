import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsLoserFeedback from '../ResultsLoserFeedback';

const mockT = (key: string) => key;

describe('ResultsLoserFeedback', () => {
  it('renders for rank 4 (just missed podium)', () => {
    render(
      <ResultsLoserFeedback rank={4} onPlayAgain={vi.fn()} t={mockT} />
    );
    expect(screen.getByTestId('loser-feedback')).toBeInTheDocument();
    expect(screen.getByText('results.loserFeedback.almostPodium')).toBeInTheDocument();
  });

  it('renders for rank 6 (mid-field)', () => {
    render(
      <ResultsLoserFeedback rank={6} onPlayAgain={vi.fn()} t={mockT} />
    );
    expect(screen.getByText('results.loserFeedback.goodFight')).toBeInTheDocument();
  });

  it('renders for rank 8 (bottom)', () => {
    render(
      <ResultsLoserFeedback rank={8} onPlayAgain={vi.fn()} t={mockT} />
    );
    expect(screen.getByText('results.loserFeedback.solidTry')).toBeInTheDocument();
  });

  it('shows encouragement subtext', () => {
    render(
      <ResultsLoserFeedback rank={5} onPlayAgain={vi.fn()} t={mockT} />
    );
    expect(screen.getByText('results.loserFeedback.encouragement')).toBeInTheDocument();
  });

  it('has a play again button', () => {
    render(
      <ResultsLoserFeedback rank={5} onPlayAgain={vi.fn()} t={mockT} />
    );
    expect(screen.getByRole('button', { name: 'results.playAgain' })).toBeInTheDocument();
  });

  it('calls onPlayAgain when button clicked', () => {
    const onPlayAgain = vi.fn();
    render(
      <ResultsLoserFeedback rank={5} onPlayAgain={onPlayAgain} t={mockT} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'results.playAgain' }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });

  it('does NOT render for rank 1 (winner)', () => {
    const { container } = render(
      <ResultsLoserFeedback rank={1} onPlayAgain={vi.fn()} t={mockT} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does NOT render for rank 3 (podium)', () => {
    const { container } = render(
      <ResultsLoserFeedback rank={3} onPlayAgain={vi.fn()} t={mockT} />
    );
    expect(container.firstChild).toBeNull();
  });
});
