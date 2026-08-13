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
let mockPracticeStreak = 3;
vi.mock('@/hooks/usePracticeStreak', () => ({
  usePracticeStreak: () => ({ current: mockPracticeStreak, longest: mockPracticeStreak, record: vi.fn() }),
  getPracticeStreak: () => ({ current: mockPracticeStreak, longest: mockPracticeStreak }),
}));

const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordHuntToday: () => false,
}));

const mockTrackShown = vi.fn();
const mockTrackClicked = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackFirstSessionDailyShown: (...args: unknown[]) => mockTrackShown(...args),
  trackFirstSessionDailyClicked: (...args: unknown[]) => mockTrackClicked(...args),
}));

import PracticeCompletePopup from '../PracticeCompletePopup';

beforeEach(() => {
  window.localStorage.clear();
  mockPracticeStreak = 3;
  mockTrackShown.mockClear();
  mockTrackClicked.mockClear();
  for (const key of Array.from(mockSearchParams.keys())) mockSearchParams.delete(key);
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

  // Regression: the celebratory panel revealed via a Framer entrance starting at
  // opacity 0. When that animation didn't run (observed on Hebrew/RTL) only the
  // dark backdrop showed — "a black overlay screen". The panel must reveal via a
  // CSS entrance whose resting state is visible, never a stuck inline opacity:0.
  it('reveals the panel via a CSS entrance, never a stuck inline opacity:0', () => {
    render(<PracticeCompletePopup open mode="classic" />);
    const panel = screen.getByTestId('practice-complete-popup-panel-classic');
    expect(panel.className).toContain('animate-pop-in');
    expect(panel.style.opacity).not.toBe('0');
  });

  it('shouldPitchLiveDailyWhenFirstSessionClassicCompletes', () => {
    // GIVEN the FTUE first practice day just hit its goal
    mockPracticeStreak = 1;
    mockSearchParams.set('firstGame', '1');

    // WHEN the completion popup opens
    render(<PracticeCompletePopup open mode="classic" />);

    // THEN the primary CTA is today's live Daily, not the next practice mode
    const cta = screen.getByTestId('first-session-daily-cta');
    expect(cta).toHaveAttribute('href', '/en/daily/word-hunt?from=first_game');
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();
    expect(screen.getByTestId('first-session-comeback')).toBeInTheDocument();
    expect(mockTrackShown).toHaveBeenCalledWith(expect.objectContaining({ variant: 'first_session' }));
  });

  it('shouldKeepPracticeChainWhenReturningPlayerCompletesClassic', () => {
    // GIVEN a returning player (streak > 1, no firstGame flag)
    mockPracticeStreak = 4;

    // WHEN they finish classic practice
    render(<PracticeCompletePopup open mode="classic" />);

    // THEN the existing practice-chain handoff stays
    expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('first-session-daily-cta')).toBeNull();
  });
});
