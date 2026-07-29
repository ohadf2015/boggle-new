/**
 * TutorialGame is now a transition step (no mini-grid). It fires
 * onboarding_first_word_found once on mount with the synthetic 'PRACTICE'
 * marker so the existing FTUE funnel still pairs with score_reveal events.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingFirstWord: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const Wrap = React.forwardRef(function Wrap({ children, ...p }: any, ref: any) {
    return <div ref={ref} {...p}>{children}</div>;
  });
  return {
    m: new Proxy({} as any, { get: () => Wrap }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('lucide-react', () => ({
  ArrowRight: () => null,
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: () => null,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import TutorialGame from '../TutorialGame';
import { trackOnboardingFirstWord } from '@/utils/growthTracking';

describe('TutorialGame analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fires first-word event once on mount with default attemptNumber=1', () => {
    render(<TutorialGame onComplete={vi.fn()} />);
    expect(trackOnboardingFirstWord).toHaveBeenCalledTimes(1);
    expect(trackOnboardingFirstWord).toHaveBeenCalledWith('PRACTICE', 1);
  });

  it('carries attemptNumber prop through to event', () => {
    render(<TutorialGame onComplete={vi.fn()} attemptNumber={3} />);
    expect(trackOnboardingFirstWord).toHaveBeenCalledWith('PRACTICE', 3);
  });

  it('fires onComplete with zero score and empty words when CTA tapped', () => {
    const onComplete = vi.fn();
    render(<TutorialGame onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('tutorial-continue'));
    expect(onComplete).toHaveBeenCalledWith(0, []);
  });
});
