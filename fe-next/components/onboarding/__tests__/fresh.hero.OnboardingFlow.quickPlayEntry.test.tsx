/**
 * Piece B (hero): the homepage hero PLAY opens OnboardingFlow with
 * entry="quickPlay". The visitor already traced the demo word in the hero, so
 * the flow must NOT show QuickStartStep (the duplicate CAT demo) even for one
 * frame. It runs the SAME quick-start exit (handleQuickStartPlay: same
 * markOnboardingComplete payload, same destination) exactly once.
 * A pending room invite and CrazyGames keep their own flows.
 */
import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const trackQuickPlay = vi.fn();
const trackGrowth = vi.fn();
const trackCompleted = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingStart: vi.fn(),
  trackOnboardingStep: vi.fn(),
  trackOnboardingCompleted: (...a: unknown[]) => trackCompleted(...a),
  trackOnboardingSkipped: vi.fn(),
  trackOnboardingQuickPlay: (...a: unknown[]) => trackQuickPlay(...a),
  trackInviteTutorialSkipped: vi.fn(),
  trackInviteConsumed: vi.fn(),
  trackGrowthEvent: (...a: unknown[]) => trackGrowth(...a),
}));

vi.mock('framer-motion', () => {
  const R = require('react');
  const make = (tag: string) =>
    R.forwardRef(function MotionComponent({ children, ...props }: any, ref: any) {
      const { initial: _i, animate: _a, exit: _e, transition: _t, ...rest } = props;
      return R.createElement(tag, { ref, ...rest }, children);
    });
  const motion = new Proxy({} as Record<string, any>, { get: (_t, p: string) => make(p) });
  return { motion, m: motion, AnimatePresence: ({ children }: any) => <>{children}</> };
});

const markComplete = vi.fn();
const pending = { invite: null as null | { code: string } };
vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: (...a: unknown[]) => markComplete(...a),
  markOnboardingSkipped: vi.fn(),
  hasCompletedOnboarding: () => false,
  consumePendingRoomInvite: () => (pending.invite ? pending.invite.code : null),
  hasPendingRoomInvite: () => !!pending.invite,
  getPendingRoomInvite: () => pending.invite,
}));

const guest = { games: 0 };
vi.mock('@/utils/guestManager', () => ({
  getGuestStats: () => ({ games: guest.games, wins: 0, words: 0, score: 0 }),
}));
vi.mock('@/utils/profileStorage', () => ({ setStoredCustomAvatar: vi.fn(), getStoredCustomAvatar: vi.fn(() => null) }));
vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPlayerName: () => 'Zippy Fox' }));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }), usePathname: () => '/en' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, user: null, isAdmin: false }) }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useAccessibility: () => ({ updateSetting: vi.fn() }) }));
const cg = { isOnCrazyGamesPlatform: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));
vi.mock('@/components/auth/AuthModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/HowToPlay', () => ({ __esModule: true, default: () => null }));
vi.mock('../QuickStartStep', () => ({ __esModule: true, default: () => <div data-testid="quick-start-step" /> }));
vi.mock('../LanguageSelect', () => ({ __esModule: true, default: () => <div data-testid="language-step" /> }));
vi.mock('../ReturningUserStep', () => ({ __esModule: true, default: () => <div data-testid="returning-step" /> }));
vi.mock('../CrazyGamesTutorial', () => ({ __esModule: true, default: () => <div data-testid="cg-tutorial" /> }));
vi.mock('../CrazyGamesWelcome', () => ({ __esModule: true, default: () => <div data-testid="cg-welcome" /> }));
vi.mock('@/hooks/useInviteOnboardingMode', () => ({
  useInviteOnboardingMode: () => ({
    isInviteMode: !!pending.invite,
    inviteAtMount: pending.invite,
    activeSteps: pending.invite ? ['language', 'profile', 'inviteTutorial'] : ['quickStart'],
    handleInviteTeaserComplete: vi.fn(),
  }),
}));

import OnboardingFlow from '../OnboardingFlow';

describe('OnboardingFlow entry="quickPlay" (homepage hero PLAY)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pending.invite = null;
    guest.games = 0;
    cg.isOnCrazyGamesPlatform = false;
  });

  it('goes straight into the first game, once, without rendering QuickStartStep', () => {
    const onComplete = vi.fn();
    render(
      <StrictMode>
        <OnboardingFlow onComplete={onComplete} entry="quickPlay" />
      </StrictMode>
    );
    expect(screen.queryByTestId('quick-start-step')).toBeNull();
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/en/singleplayer?autoStart=bots');
    expect(markComplete).toHaveBeenCalledTimes(1);
    expect(markComplete).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Zippy Fox', selectedMode: 'home', nameEdited: false })
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows the loading cover while navigating (never a blank screen)', () => {
    render(<OnboardingFlow onComplete={vi.fn()} entry="quickPlay" />);
    expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();
  });

  it('keeps the funnel comparable: quickstart_play_clicked + quick_play tagged with the entry', () => {
    render(<OnboardingFlow onComplete={vi.fn()} entry="quickPlay" />);
    expect(trackGrowth).toHaveBeenCalledWith('quickstart_play_clicked', { entry: 'home_hero' });
    expect(trackQuickPlay).toHaveBeenCalledWith({ source: 'quick_start', entry: 'home_hero' });
    expect(trackCompleted).toHaveBeenCalledTimes(1);
  });

  it('skips the returning-guest prompt too: PLAY means play', () => {
    guest.games = 3;
    render(<OnboardingFlow onComplete={vi.fn()} entry="quickPlay" />);
    expect(screen.queryByTestId('returning-step')).toBeNull();
    expect(pushMock).toHaveBeenCalledWith('/en/singleplayer?autoStart=bots');
  });

  it('a pending room invite wins: the invite flow runs, no auto-play', () => {
    pending.invite = { code: 'ABCD' };
    render(<OnboardingFlow onComplete={vi.fn()} entry="quickPlay" />);
    expect(screen.getByTestId('language-step')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('CrazyGames keeps its own welcome flow', () => {
    cg.isOnCrazyGamesPlatform = true;
    render(<OnboardingFlow onComplete={vi.fn()} entry="quickPlay" />);
    expect(screen.getByTestId('cg-tutorial')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('without entry, the flow is unchanged (QuickStartStep shows, nothing auto-fires)', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(screen.getByTestId('quick-start-step')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
