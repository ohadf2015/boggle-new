import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdventureHuntClueBoxes from '../AdventureHuntClueBoxes';
import type { LetterFeedback } from '@/shared/types/game';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, vars?: Record<string, unknown>) => {
    if (vars) return `${k}:${JSON.stringify(vars)}`;
    return k;
  }, language: 'en' }),
}));

describe('AdventureHuntClueBoxes', () => {
  it('renders N empty boxes matching targetLength when no attempts', () => {
    render(
      <AdventureHuntClueBoxes
        targetLength={5}
        attempts={[]}
        huntFound={false}
      />
    );
    const boxes = screen.getAllByTestId(/^hunt-clue-box-/);
    expect(boxes).toHaveLength(5);
  });

  it('renders feedback for last attempt letters', () => {
    const feedback: LetterFeedback[] = ['correct', 'present', 'absent', 'correct'];
    render(
      <AdventureHuntClueBoxes
        targetLength={4}
        attempts={[{ guess: 'ABCD', feedback }]}
        huntFound={false}
      />
    );
    expect(screen.getByTestId('hunt-clue-box-0')).toHaveAttribute('data-feedback', 'correct');
    expect(screen.getByTestId('hunt-clue-box-1')).toHaveAttribute('data-feedback', 'present');
    expect(screen.getByTestId('hunt-clue-box-2')).toHaveAttribute('data-feedback', 'absent');
    expect(screen.getByTestId('hunt-clue-box-3')).toHaveAttribute('data-feedback', 'correct');
  });

  it('shows tries remaining counter', () => {
    render(
      <AdventureHuntClueBoxes
        targetLength={4}
        attempts={[
          { guess: 'ABCD', feedback: ['absent','absent','absent','absent'] },
          { guess: 'EFGH', feedback: ['absent','absent','absent','absent'] },
        ]}
        huntFound={false}
      />
    );
    expect(screen.getByTestId('hunt-tries-counter')).toBeInTheDocument();
  });
});
