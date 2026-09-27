/**
 * TutorialGame is now a transition step — friendly mascot greeting + CTA that
 * hands the player off to /practice. The actual mechanic-teaching lives in the
 * practice modes. Public surface: data-testids `tutorial-game` + `tutorial-continue`.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  Mascot: ({ variant }: any) => <div data-testid={`mascot-${variant}`} />,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingFirstWord: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: any) => (typeof fallback === 'string' ? fallback : key),
    language: 'en',
    dir: 'ltr',
  }),
}));

import TutorialGame from '../TutorialGame';

describe('TutorialGame (practice transition)', () => {
  const defaultProps = { onComplete: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the transition surface', () => {
    render(<TutorialGame {...defaultProps} />);
    expect(screen.getByTestId('tutorial-game')).toBeInTheDocument();
  });

  it('renders a celebration-variant mascot', () => {
    render(<TutorialGame {...defaultProps} />);
    expect(screen.getByTestId('mascot-celebration')).toBeInTheDocument();
  });

  it('renders the welcome greeting + tip + CTA', () => {
    render(<TutorialGame {...defaultProps} />);
    expect(screen.getByText('practiceWelcome.greet')).toBeInTheDocument();
    expect(screen.getByText('practiceWelcome.tip')).toBeInTheDocument();
    expect(screen.getByTestId('tutorial-continue')).toBeInTheDocument();
  });

  it('does NOT render the old mini-grid mechanic', () => {
    render(<TutorialGame {...defaultProps} />);
    expect(screen.queryByTestId('mini-grid')).toBeNull();
    expect(screen.queryByTestId('word-counter')).toBeNull();
  });

  it('fires onComplete with zero score and no words on CTA tap', () => {
    const onComplete = vi.fn();
    render(<TutorialGame onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('tutorial-continue'));
    expect(onComplete).toHaveBeenCalledWith(0, []);
  });
});
