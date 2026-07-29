/**
 * PracticeCompletePopup — celebratory overlay shown when a sandbox goal is met.
 * Wraps PracticeCompleteBanner (status pill) + PracticeChainCta (next-mode link)
 * in a fixed-position modal so the "continue" CTA is visible without scrolling
 * the sandbox column. ESC + "keep practicing" close the popup but DON'T navigate
 * (keeps the player free to keep playing in the same mode).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: vi.fn() }),
}));
vi.mock('@/hooks/usePracticeStreak', () => ({
  usePracticeStreak: () => ({ current: 3, longest: 3 }),
  getPracticeStreak: () => ({ current: 3, longest: 3 }),
}));

import PracticeCompletePopup from '../PracticeCompletePopup';

beforeEach(() => {
  window.localStorage.clear();
});

describe('PracticeCompletePopup', () => {
  it('renders nothing when open is false', () => {
    render(<PracticeCompletePopup open={false} mode="classic" />);
    expect(screen.queryByTestId('practice-complete-popup')).toBeNull();
  });

  it('renders banner + chain CTA when open', () => {
    render(<PracticeCompletePopup open mode="classic" />);
    expect(screen.getByTestId('practice-complete-popup')).toBeInTheDocument();
    // Inner primitives keep their testids so existing completion tests pass.
    expect(screen.getByTestId('practice-complete-banner')).toBeInTheDocument();
    expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
  });

  it('exposes a "keep practicing" dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<PracticeCompletePopup open mode="classic" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('practice-complete-popup-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides dismiss button when onDismiss is not provided', () => {
    render(<PracticeCompletePopup open mode="classic" />);
    expect(screen.queryByTestId('practice-complete-popup-dismiss')).toBeNull();
  });

  it('closes on ESC when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<PracticeCompletePopup open mode="classic" onDismiss={onDismiss} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not close on ESC when no dismiss handler (popup is non-dismissible)', () => {
    render(<PracticeCompletePopup open mode="classic" />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('practice-complete-popup')).toBeInTheDocument();
  });

  it('uses mode-specific accent (cyan/lime/purple) per mode', () => {
    const { rerender, container } = render(
      <PracticeCompletePopup open mode="classic" />,
    );
    expect(container.querySelector('.border-neo-cyan')).not.toBeNull();
    rerender(<PracticeCompletePopup open mode="wordHunt" />);
    expect(container.querySelector('.border-neo-lime')).not.toBeNull();
    rerender(<PracticeCompletePopup open mode="wheelRush" />);
    expect(container.querySelector('.border-neo-purple')).not.toBeNull();
  });

  it('has dialog semantics for screen readers', () => {
    render(<PracticeCompletePopup open mode="classic" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('shows a single primary CTA (continue) with no competing "play real" link', () => {
    // Simplified flow: one clear next step out of the popup, not two CTAs.
    render(<PracticeCompletePopup open mode="classic" />);
    expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('practice-complete-popup-play-real')).toBeNull();
  });
});
