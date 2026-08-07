/**
 * exp-practice-wheel-cta-v1 — retry-cta variant tests.
 *
 * When the timer expires and the practice goal isn't reached, the `retry-cta`
 * variant shows a "Try Again" overlay instead of immediately redirecting to
 * the live game. control = redirect immediately (existing behaviour).
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Experiment mock (retry-cta variant) ---
const mockTrackExposure = vi.fn();
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'retry-cta', trackExposure: mockTrackExposure }),
}));

// --- Capture the onComplete callback from WordWheelGame ---
let capturedOnComplete: ((result: unknown) => void) | null = null;
vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: (props: { onComplete?: (r: unknown) => void }) => {
    capturedOnComplete = props.onComplete ?? null;
    return <div data-testid="word-wheel-game-stub" />;
  },
}));

// --- Other required mocks ---
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: vi.fn().mockResolvedValue({ isValid: true }) }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));
vi.mock('@/lib/practice/telemetry', () => ({
  trackPracticeStarted: vi.fn(),
  trackPracticeWordFound: vi.fn(),
  trackPracticeCompleted: vi.fn(),
  trackPracticeRetry: vi.fn(),
  trackPracticeGameOver: vi.fn(),
  trackPracticeAbandoned: vi.fn(),
  trackPracticeChainClicked: vi.fn(),
}));
vi.mock('@/hooks/usePracticeStreak', () => ({ getPracticeStreak: () => ({ current: 1 }) }));
vi.mock('@/lib/practice/practiceProgress', () => ({
  markPracticeMode: vi.fn(),
  PRACTICE_GOALS: { wheelRush: 3 },
}));
vi.mock('@/lib/practice/practiceRoute', () => ({
  practiceTargetUrl: () => '/en/word-wheel',
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    solutions: ['BAD', 'CAB'],
    puzzleDate: '',
    puzzleNumber: 0,
  }),
}));
vi.mock('./PracticeInstructions', () => ({ default: () => null }));
vi.mock('./PracticeBailoutCta', () => ({
  default: (props: { done: boolean; href: string }) => (
    <a data-testid="practice-bailout-cta" href={props.href}>bailout</a>
  ),
}));
vi.mock('./PracticeCompletePopup', () => ({ default: () => null }));
vi.mock('./PracticePostCompleteChip', () => ({ default: () => null }));

import PracticeWheelSandbox from '../PracticeWheelSandbox';

beforeEach(() => {
  capturedOnComplete = null;
  mockPush.mockReset();
  mockTrackExposure.mockReset();
});

describe('exp-practice-wheel-cta-v1 — retry-cta variant', () => {
  it('does NOT show retry overlay before game ends', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByTestId('practice-retry-cta')).toBeNull();
  });

  it('shows retry overlay when timer expires before goal is reached', async () => {
    render(<PracticeWheelSandbox />);
    expect(capturedOnComplete).not.toBeNull();

    await act(async () => {
      capturedOnComplete!(null);
    });

    expect(screen.getByTestId('practice-retry-cta')).toBeInTheDocument();
  });

  it('does NOT redirect immediately on game-over in retry-cta variant', async () => {
    render(<PracticeWheelSandbox />);
    await act(async () => { capturedOnComplete!(null); });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('resets the game and hides overlay when "Try Again" is clicked', async () => {
    const user = userEvent.setup();
    render(<PracticeWheelSandbox />);
    await act(async () => { capturedOnComplete!(null); });

    const retryBtn = screen.getByTestId('practice-retry-cta');
    await user.click(retryBtn);

    expect(screen.queryByTestId('practice-retry-cta')).toBeNull();
  });
});
