import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepPrompt from '../NextStepPrompt';

/**
 * NextStepPrompt is the ONLY cross-mode CTA in the product and it emitted
 * nothing — not an impression, not a click. Meanwhile `daily_puzzle_opened`
 * ran at 151/14d against 6,387 `results_viewed`, and there was no way to tell
 * whether the daily CTA was never shown, never tapped, or tapped and broken.
 *
 * These two events close that gap: `to` is the destination mode, so the
 * daily-challenge funnel can be measured per source surface.
 */

const mockRouterPush = vi.fn();
const mockTrack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
}));

describe('NextStepPrompt tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports an impression with the destination mode', () => {
    render(
      <NextStepPrompt currentMode="solo-bots" onBackToLobby={vi.fn()} variant="mobile" />
    );

    expect(mockTrack).toHaveBeenCalledWith('next_step_shown', {
      from: 'solo-bots',
      to: 'daily',
      variant: 'mobile',
    });
  });

  it('reports exactly one impression across re-renders', () => {
    const { rerender } = render(
      <NextStepPrompt currentMode="solo-bots" onBackToLobby={vi.fn()} variant="mobile" />
    );
    rerender(
      <NextStepPrompt currentMode="solo-bots" onBackToLobby={vi.fn()} variant="mobile" />
    );

    const impressions = mockTrack.mock.calls.filter(([event]) => event === 'next_step_shown');
    expect(impressions).toHaveLength(1);
  });

  it('reports the click before navigating', async () => {
    const user = userEvent.setup();

    render(
      <NextStepPrompt currentMode="solo-bots" onBackToLobby={vi.fn()} variant="mobile" />
    );

    await user.click(screen.getByRole('button', { name: /nextStep\.tryDailyChallenge/i }));

    expect(mockTrack).toHaveBeenCalledWith('next_step_clicked', {
      from: 'solo-bots',
      to: 'daily',
      variant: 'mobile',
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/en/daily');
  });

  it('reports the multiplayer destination from the daily surface', () => {
    render(
      <NextStepPrompt currentMode="daily" onBackToLobby={vi.fn()} variant="desktop" />
    );

    expect(mockTrack).toHaveBeenCalledWith('next_step_shown', {
      from: 'daily',
      to: 'multiplayer',
      variant: 'desktop',
    });
  });

  it('does not report an impression for the close-loss rematch card', () => {
    render(
      <NextStepPrompt
        currentMode="multiplayer-bots"
        onBackToLobby={vi.fn()}
        isCloseLoss
        scoreDifference={3}
        onRematch={vi.fn()}
      />
    );

    const impressions = mockTrack.mock.calls.filter(([event]) => event === 'next_step_shown');
    expect(impressions).toHaveLength(0);
  });
});
