/**
 * OnboardingFlow analytics — FTUE funnel events fire at each step transition.
 * Short state machine: language -> [calmMode (admin)] -> profile -> style -> home.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingStart: vi.fn(),
  trackOnboardingStep: vi.fn(),
  trackOnboardingCompleted: vi.fn(),
  trackOnboardingSkipped: vi.fn(),
  trackOnboardingQuickPlay: vi.fn(),
  trackInviteTutorialSkipped: vi.fn(),
  trackInviteConsumed: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef(function MotionComponent({ children, ...props }: any, ref: any) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  const motion = new Proxy({} as Record<string, any>, {
    get: (_t, p: string) => createMotionComponent(p),
  });
  return {
    motion,
    m: motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const mockHasPendingRoom = vi.fn(() => false);
const mockConsumePendingRoom = vi.fn((): string | null => null);
const mockGetPendingRoom = vi.fn(() => null);
vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: vi.fn(),
  markOnboardingSkipped: vi.fn(),
  hasCompletedOnboarding: () => false,
  consumePendingRoomInvite: () => mockConsumePendingRoom(),
  hasPendingRoomInvite: () => mockHasPendingRoom(),
  getPendingRoomInvite: () => mockGetPendingRoom(),
}));

// Mock getGuestStats to return returning user (1+ games) so ReturningUserStep appears in flow
vi.mock('@/utils/guestManager', async () => {
  const actual = await vi.importActual('@/utils/guestManager');
  return {
    ...actual,
    getGuestStats: () => ({ games: 1, wins: 0, words: 0, score: 0 }),
  };
});

vi.mock('@/utils/profileStorage', () => ({
  setStoredCustomAvatar: vi.fn(),
  getStoredCustomAvatar: vi.fn(() => null),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  // Admin so the (admin-gated) Calm Mode vibe step appears in the flow.
  useAuth: () => ({ isAuthenticated: false, user: null, isAdmin: true }),
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../ReturningUserStep', () => ({
  __esModule: true,
  default: ({ onNew }: any) => (
    <button data-testid="new-btn" onClick={onNew}>new</button>
  ),
}));

vi.mock('../LanguageSelect', () => ({
  __esModule: true,
  default: ({ onSelect, onPlayNow }: any) => (
    <>
      <button data-testid="lang-btn" onClick={onSelect}>lang</button>
      {onPlayNow && <button data-testid="lang-play-now" onClick={onPlayNow}>play-now</button>}
    </>
  ),
}));

vi.mock('../QuickProfileSetup', () => ({
  __esModule: true,
  default: ({ onComplete, hasPendingInvite }: any) => (
    <button
      data-testid="profile-btn"
      data-pending={String(!!hasPendingInvite)}
      onClick={() => onComplete('Player1', {}, false)}
    >
      profile
    </button>
  ),
}));

vi.mock('../StyleSelectStep', () => ({
  __esModule: true,
  default: ({ onComplete }: any) => (
    <button data-testid="style-btn" onClick={onComplete}>style</button>
  ),
}));

vi.mock('../QuickStartStep', () => ({
  __esModule: true,
  default: ({ onPlay }: any) => (
    <button data-testid="quick-start-btn" onClick={() => onPlay('Player1', {}, false)}>play</button>
  ),
}));

vi.mock('@/components/HowToPlay', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../CalmModeChoice', () => ({
  __esModule: true,
  default: ({ onChoose }: any) => (
    <button data-testid="vibe-energetic" onClick={() => onChoose(false)}>vibe</button>
  ),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({ updateSetting: vi.fn() }),
}));

vi.mock('../OnboardingProgress', () => ({
  __esModule: true,
  default: () => null,
}));

import OnboardingFlow from '../OnboardingFlow';
import {
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingQuickPlay,
} from '@/utils/growthTracking';

describe('OnboardingFlow analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPendingRoom.mockReturnValue(false);
    mockConsumePendingRoom.mockReturnValue(null);
  });

  const goNew = () => fireEvent.click(screen.getByTestId('new-btn'));
  // Admin picks a vibe (calm/energetic) before the one screen.
  const chooseVibe = () => fireEvent.click(screen.getByTestId('vibe-energetic'));
  const advanceToQuickStart = () => {
    goNew();
    chooseVibe();
  };
  const play = () => fireEvent.click(screen.getByTestId('quick-start-btn'));

  it('fires onboarding_started once on mount', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(trackOnboardingStart).toHaveBeenCalledTimes(1);
  });

  it('fires step=calmMode when an admin picks a vibe', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToQuickStart();
    expect(trackOnboardingStep).toHaveBeenCalledWith('calmMode', { cosy: false });
  });

  it('fires step=quickStart on play, carrying whether the name was edited', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToQuickStart();
    play();
    expect(trackOnboardingStep).toHaveBeenCalledWith('quickStart', { nameEdited: false });
  });

  it('fires step=quickStart exactly once, even on a double tap', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToQuickStart();
    play();
    play();

    const calls = (trackOnboardingStep as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter((c) => c[0] === 'quickStart');
    expect(calls).toHaveLength(1);
  });

  // The base funnel no longer has separate language / profile / style stages —
  // they are all one screen now. Emitting them would corrupt the live funnel.
  it('never emits the retired language, profile, style or tutorial steps', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToQuickStart();
    play();

    const emitted = (trackOnboardingStep as unknown as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => c[0]);
    expect(emitted).not.toContain('language');
    expect(emitted).not.toContain('profile');
    expect(emitted).not.toContain('style');
    expect(emitted).not.toContain('tutorial');
  });

  // D1-retention lever: every FTUE exit that lands in an auto-started
  // practice game must fire onboarding_quick_play so the lift is measurable
  // against the return-visit funnel.
  it('fires onboarding_quick_play (source=quick_start) when the one-screen PLAY starts a real game', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToQuickStart();
    play();
    expect(trackOnboardingQuickPlay).toHaveBeenCalledTimes(1);
    expect(trackOnboardingQuickPlay).toHaveBeenCalledWith({ source: 'quick_start' });
  });

  it('fires onboarding_quick_play (source=ftue_skip) when Play Now bails out of the language step', () => {
    // Pending room invite forces the language-first flow, where the
    // "Skip → Play Now" escape lives.
    mockGetPendingRoom.mockReturnValue({ code: 'ROOM1', hostName: 'Host' });
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lang-play-now'));
    expect(trackOnboardingQuickPlay).toHaveBeenCalledTimes(1);
    expect(trackOnboardingQuickPlay).toHaveBeenCalledWith({ source: 'ftue_skip', at_step: 'language' });
  });
});
