import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RivalCompareCard from '../RivalCompareCard';

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'daily.rival.youWin': 'You beat {name}!',
    'daily.rival.youLose': '{name} wins this round',
    'daily.rival.tie': "It's a tie! 🤝",
    'daily.rival.score': 'Score',
    'daily.rival.freshStart': 'Fresh week. First points take the lead!',
    'daily.rival.gapToPass': '{points} more to pass {name}',
  };
  return translations[key] || key;
};

describe('RivalCompareCard', () => {
  it('should render rival data when provided', () => {
    render(
      <RivalCompareCard
        rivalName="Alice"
        rivalEmoji="🎯"
        rivalScore={250}
        myScore={300}
        t={mockT}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('should show win state when myScore > rivalScore', () => {
    render(
      <RivalCompareCard
        rivalName="Alice"
        rivalEmoji="🎯"
        rivalScore={250}
        myScore={300}
        t={mockT}
      />
    );

    // Should show win message with neo-lime styling
    const winMessage = screen.getByText('You beat Alice!');
    expect(winMessage).toBeInTheDocument();
    expect(winMessage).toHaveClass('text-neo-lime');
  });

  it('should show lose state when myScore < rivalScore', () => {
    render(
      <RivalCompareCard
        rivalName="Bob"
        rivalEmoji="🔥"
        rivalScore={350}
        myScore={300}
        t={mockT}
      />
    );

    // Losing shows the exact gap to close, in pink
    const loseMessage = screen.getByText('51 more to pass Bob');
    expect(loseMessage).toBeInTheDocument();
    expect(loseMessage).toHaveClass('text-neo-pink');
  });

  it('should show tie state when scores are equal', () => {
    render(
      <RivalCompareCard
        rivalName="Charlie"
        rivalEmoji="💫"
        rivalScore={300}
        myScore={300}
        t={mockT}
      />
    );

    // Should show tie message
    const tieMessage = screen.getByText("It's a tie! 🤝");
    expect(tieMessage).toBeInTheDocument();
  });

  it('should apply neo-brutalist styling', () => {
    const { container } = render(
      <RivalCompareCard
        rivalName="Alice"
        rivalEmoji="🎯"
        rivalScore={250}
        myScore={300}
        t={mockT}
      />
    );

    // Should have neo-brutalist border and shadow
    const card = container.querySelector('[class*="border-neo"]');
    expect(card).toBeInTheDocument();
  });

  it('should handle zero scores', () => {
    const { container } = render(
      <RivalCompareCard
        rivalName="Alice"
        rivalEmoji="🎯"
        rivalScore={0}
        myScore={0}
        t={mockT}
      />
    );

    // Both scores should be rendered
    expect(screen.getByTestId('rival-score-them')).toHaveTextContent('0');
    expect(screen.getByTestId('rival-score-me')).toHaveTextContent('0');
    // 0 vs 0 is a fresh race, not a tie: an even bar and a call to take the lead.
    expect(screen.getByText('Fresh week. First points take the lead!')).toBeInTheDocument();
    expect(screen.getByTestId('rival-tug')).toHaveAttribute('aria-valuenow', '50');
    expect(container).toBeTruthy();
  });

  it('should handle large scores', () => {
    const { container } = render(
      <RivalCompareCard
        rivalName="Alice"
        rivalEmoji="🎯"
        rivalScore={9999}
        myScore={10000}
        t={mockT}
      />
    );

    expect(container).toBeTruthy();
    expect(screen.getByTestId('rival-score-them')).toHaveTextContent('9999');
    expect(screen.getByTestId('rival-score-me')).toHaveTextContent('10000');
  });

  it('leans the tug-of-war bar toward whoever is ahead', () => {
    render(<RivalCompareCard rivalName="Joker" rivalEmoji="🃏" rivalScore={100} myScore={300} t={mockT} />);
    expect(screen.getByTestId('rival-tug')).toHaveAttribute('aria-valuenow', '75');
  });
});
