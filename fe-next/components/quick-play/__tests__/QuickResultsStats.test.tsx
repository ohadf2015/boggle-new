import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickResultsStats } from '../QuickResultsStats';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const cards = ['quick-stat-score', 'quick-stat-perfect', 'quick-stat-words'];

describe('QuickResultsStats', () => {
  it('lands score, then % of perfect, then words, one after another', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate />);
    const delays = cards.map((id) => Number(screen.getByTestId(id).getAttribute('data-delay')));
    expect(delays[0]).toBeLessThan(delays[1]);
    expect(delays[1]).toBeLessThan(delays[2]);
  });

  it('starts every card from zero so the count-up is visible', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate />);
    expect(screen.getByTestId('quick-stat-score')).toHaveTextContent(/^quickPlay\.solo\.statScore0$/);
  });

  it('shows the real values straight away when motion is off', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate={false} />);
    expect(screen.getByTestId('quick-stat-score')).toHaveTextContent('900');
    expect(screen.getByTestId('quick-hero-percentage')).toHaveTextContent('90%');
    expect(screen.getByTestId('quick-stat-words')).toHaveTextContent('9');
    expect(screen.getByTestId('quick-stat-perfect')).toHaveTextContent('quickPlay.solo.ofPerfect');
  });

  it('carries each final value for assistive tech and tests', () => {
    render(<QuickResultsStats score={0} scorePct={0} wordsFound={0} animate />);
    expect(cards.map((id) => screen.getByTestId(id).getAttribute('data-value'))).toEqual(['0', '0', '0']);
  });
});
