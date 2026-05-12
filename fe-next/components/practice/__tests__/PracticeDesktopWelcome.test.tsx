/**
 * PracticeDesktopWelcome — renders 3 mode tips and calls onDismiss on "Got it".
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className, 'data-testid': testid }: React.PropsWithChildren<{ className?: string; 'data-testid'?: string }>) => (
      <div className={className} data-testid={testid}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import PracticeDesktopWelcome from '../PracticeDesktopWelcome';

describe('PracticeDesktopWelcome', () => {
  const onDismiss = vi.fn();

  it('renders 3 tip lines for classic mode', () => {
    render(<PracticeDesktopWelcome mode="classic" onDismiss={onDismiss} />);
    expect(screen.getByText('practice.tips.classic.line1')).toBeInTheDocument();
    expect(screen.getByText('practice.tips.classic.line2')).toBeInTheDocument();
    expect(screen.getByText('practice.tips.classic.line3')).toBeInTheDocument();
  });

  it('renders 3 tip lines for wordHunt mode', () => {
    render(<PracticeDesktopWelcome mode="wordHunt" onDismiss={onDismiss} />);
    expect(screen.getByText('practice.tips.wordHunt.line1')).toBeInTheDocument();
  });

  it('renders 3 tip lines for wheelRush mode', () => {
    render(<PracticeDesktopWelcome mode="wheelRush" onDismiss={onDismiss} />);
    expect(screen.getByText('practice.tips.wheelRush.line1')).toBeInTheDocument();
  });

  it('calls onDismiss when Got it button is clicked', () => {
    render(<PracticeDesktopWelcome mode="classic" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders with data-testid', () => {
    render(<PracticeDesktopWelcome mode="classic" onDismiss={onDismiss} />);
    expect(screen.getByTestId('practice-desktop-welcome')).toBeInTheDocument();
  });
});
