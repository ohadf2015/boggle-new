/**
 * PracticeDesktopWelcome — renders 2 mode tips and calls onDismiss on "Got it".
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

  it('renders the two essential tip lines for classic mode (third dropped)', () => {
    render(<PracticeDesktopWelcome mode="classic" onDismiss={onDismiss} />);
    expect(screen.getByText('practice.tips.classic.line1')).toBeInTheDocument();
    expect(screen.getByText('practice.tips.classic.line2')).toBeInTheDocument();
    // line3 trimmed to cut on-screen word count.
    expect(screen.queryByText('practice.tips.classic.line3')).toBeNull();
  });

  it('renders the first tip line for wordHunt mode', () => {
    render(<PracticeDesktopWelcome mode="wordHunt" onDismiss={onDismiss} />);
    expect(screen.getByText('practice.tips.wordHunt.line1')).toBeInTheDocument();
  });

  it('renders the first tip line for wheelRush mode', () => {
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

  it('uses lucide icons (svg), not emoji glyphs', () => {
    render(<PracticeDesktopWelcome mode="classic" onDismiss={onDismiss} />);
    const root = screen.getByTestId('practice-desktop-welcome');
    // One icon per tip (2) + a mode header icon + the CTA arrow → at least 4 svg icons.
    expect(root.querySelectorAll('svg').length).toBeGreaterThanOrEqual(4);
    // No leftover emoji glyphs anywhere in the rendered text.
    expect(root.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{FE0F}\u{2705}\u{270F}]/u);
  });
});
