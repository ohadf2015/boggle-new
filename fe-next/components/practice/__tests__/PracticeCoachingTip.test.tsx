import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeCoachingTip from '@/components/practice/PracticeCoachingTip';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'practice.hub.tip.start': 'Start with Word Hunt — it teaches clue reading',
        'practice.hub.tip.one': 'Nice start! Classic mode next — pure speed training',
        'practice.hub.tip.two': 'Almost there! Survival mode = ultimate challenge',
        'practice.hub.tip.done': 'All modes mastered! Ready for real competition!',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('PracticeCoachingTip', () => {
  it('shows start tip when 0 modes completed', () => {
    render(<PracticeCoachingTip completedCount={0} />);
    expect(screen.getByText('Start with Word Hunt — it teaches clue reading')).toBeInTheDocument();
  });

  it('shows one-mode tip when 1 mode completed', () => {
    render(<PracticeCoachingTip completedCount={1} />);
    expect(screen.getByText('Nice start! Classic mode next — pure speed training')).toBeInTheDocument();
  });

  it('shows two-mode tip when 2 modes completed', () => {
    render(<PracticeCoachingTip completedCount={2} />);
    expect(screen.getByText('Almost there! Survival mode = ultimate challenge')).toBeInTheDocument();
  });

  it('shows mastered tip when all 3 modes completed', () => {
    render(<PracticeCoachingTip completedCount={3} />);
    expect(screen.getByText('All modes mastered! Ready for real competition!')).toBeInTheDocument();
  });

  it('has neo-brutalist styling with lime border', () => {
    const { container } = render(<PracticeCoachingTip completedCount={0} />);
    const tip = container.querySelector('[data-testid="coaching-tip"]');
    expect(tip?.className).toMatch(/border-neo-lime/);
    expect(tip?.className).toMatch(/bg-neo-navy/);
  });
});
