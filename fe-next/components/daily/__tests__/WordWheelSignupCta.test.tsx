/**
 * WordWheelSignupCta — guest signup conversion CTA for the Word Wheel daily
 * results screen (experiment wheel-signup-offer-v1).
 *
 * Gating: renders ONLY for a guest with a qualifying offer (selectWheelSignupOffer)
 * AND when the experiment variant is 'streak-value'. control + authenticated +
 * weak runs render nothing. Non-predatory: value-led copy, no loss-aversion.
 *
 * Measurement: fires trackExposure() + wheel_signup_cta_viewed when shown, and
 * wheel_signup_cta_clicked when the player opens the signup surface.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WordWheelSignupCta from '../WordWheelSignupCta';

const mockVariant = vi.fn<() => string>(() => 'streak-value');
const mockTrackExposure = vi.fn();

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: (key: string) => ({ variant: mockVariant(), trackExposure: mockTrackExposure, _key: key }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars && typeof vars === 'object' && 'count' in vars ? `${key}:${(vars as { count: number }).count}` : key,
    language: 'en',
  }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

const mockRecordDismissed = vi.fn();
vi.mock('@/utils/dailyChallenge', () => ({
  recordSignupModalDismissed: () => mockRecordDismissed(),
}));

vi.mock('@/components/auth/DailyChallengeInlineSignup', () => ({
  default: ({ onDismiss }: { onDismiss?: () => void }) => (
    <div data-testid="inline-signup">
      <button onClick={onDismiss}>dismiss-inner</button>
    </div>
  ),
}));

const guestStreak = {
  isAuthenticated: false,
  isPractice: false,
  streakDays: 4,
  isFirstCompletion: false,
  dismissedRecently: false,
  score: 60,
};

describe('WordWheelSignupCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVariant.mockReturnValue('streak-value');
  });

  it('renders nothing for authenticated users', () => {
    const { container } = render(<WordWheelSignupCta {...guestStreak} isAuthenticated />);
    expect(container).toBeEmptyDOMElement();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();
  });

  it('renders nothing in control but STILL fires exposure when an offer qualifies (control denominator)', () => {
    mockVariant.mockReturnValue('control');
    const { container } = render(<WordWheelSignupCta {...guestStreak} />);
    expect(container).toBeEmptyDOMElement();
    // Eligible guest in control: exposure fires (baseline), but no CTA shown.
    expect(mockTrackExposure).toHaveBeenCalled();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('wheel_signup_cta_viewed', expect.anything());
  });

  it('renders nothing AND fires no exposure for a weak, streak-less, non-first run (ineligible)', () => {
    const { container } = render(
      <WordWheelSignupCta {...guestStreak} streakDays={0} isFirstCompletion={false} score={4} />,
    );
    expect(container).toBeEmptyDOMElement();
    // Not eligible at all — must not pollute the experiment population.
    expect(mockTrackExposure).not.toHaveBeenCalled();
  });

  it('shows the streak-value CTA and fires exposure + viewed for a qualifying guest', () => {
    render(<WordWheelSignupCta {...guestStreak} />);
    expect(screen.getByTestId('wheel-signup-cta')).toBeInTheDocument();
    expect(mockTrackExposure).toHaveBeenCalled();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'wheel_signup_cta_viewed',
      expect.objectContaining({ offerType: 'streak-value', variant: 'streak-value', streakDays: 4 }),
    );
  });

  it('opens the signup surface and fires clicked when the CTA button is pressed', () => {
    render(<WordWheelSignupCta {...guestStreak} />);
    expect(screen.queryByTestId('inline-signup')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wheel-signup-cta-button'));
    expect(screen.getByTestId('inline-signup')).toBeInTheDocument();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'wheel_signup_cta_clicked',
      expect.objectContaining({ offerType: 'streak-value', variant: 'streak-value' }),
    );
  });

  it('records dismissal cooldown when the signup surface is dismissed', () => {
    render(<WordWheelSignupCta {...guestStreak} />);
    fireEvent.click(screen.getByTestId('wheel-signup-cta-button'));
    fireEvent.click(screen.getByText('dismiss-inner'));
    expect(mockRecordDismissed).toHaveBeenCalled();
  });

  it('surfaces the rank-leader headline when the guest is #1 today', () => {
    render(<WordWheelSignupCta {...guestStreak} rank={1} totalPlayers={42} />);
    expect(screen.getByTestId('wheel-signup-cta')).toBeInTheDocument();
    // Rank copy overrides the generic offer headline.
    expect(screen.getByTestId('wheel-signup-cta-button')).toHaveTextContent(
      'wordWheel.signup.rankLeaderTitle',
    );
    // Measurement carries the rank tier so the nightly read can segment on it.
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'wheel_signup_cta_viewed',
      expect.objectContaining({ rankTier: 'leader', rank: 1 }),
    );
  });

  it('keeps the generic offer headline when the rank is not worth bragging (deep / unknown)', () => {
    render(<WordWheelSignupCta {...guestStreak} rank={250} totalPlayers={1000} />);
    expect(screen.getByTestId('wheel-signup-cta-button')).toHaveTextContent(
      'wordWheel.signup.streakTitle',
    );
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'wheel_signup_cta_viewed',
      expect.objectContaining({ rankTier: null }),
    );
  });
});
