import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickResultsStats } from '../QuickResultsStats';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/ui/AnimatedCounter', () => ({
  AnimatedCounter: ({ value, delay }: { value: number; delay?: number }) => (
    <span data-testid="counter" data-value={value} data-delay={delay} />
  ),
}));

describe('QuickResultsStats', () => {
  it('counts score then words, in sequence', () => {
    render(<QuickResultsStats score={900} wordsFound={9} />);
    const score = Number(screen.getByTestId('quick-stat-score').getAttribute('data-delay'));
    const words = Number(screen.getByTestId('quick-stat-words').getAttribute('data-delay'));
    expect(score).toBeLessThan(words);
    expect(screen.getByTestId('quick-stat-score')).toHaveTextContent('quickPlay.solo.statScore');
    expect(screen.getByTestId('quick-stat-words')).toHaveTextContent('quickPlay.solo.statWords');
  });

  it('counts each card to its real value', () => {
    render(<QuickResultsStats score={900} wordsFound={9} />);
    const values = screen.getAllByTestId('counter').map((c) => c.getAttribute('data-value'));
    expect(values).toEqual(['900', '9']);
  });

  it('renders zero values without a card going missing', () => {
    render(<QuickResultsStats score={0} wordsFound={0} />);
    expect(screen.getByTestId('quick-stats')).toBeInTheDocument();
    expect(screen.getAllByTestId('counter')).toHaveLength(2);
  });
});
