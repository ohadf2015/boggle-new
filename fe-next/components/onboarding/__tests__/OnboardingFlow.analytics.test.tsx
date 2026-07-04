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
  default: ({ onSelect }: any) => (
    <button data-testid="lang-btn" onClick={onSelect}>lang</button>
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
} from '@/utils/growthTracking';

describe('OnboardingFlow analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPendingRoom.mockReturnValue(false);
    mockConsumePendingRoom.mockReturnValue(null);
  });

  const goNew = () => fireEvent.click(screen.getByTestId('new-btn'));
  // Admin picks a vibe (calm/energetic) before the profile step.
  const chooseVibe = () => fireEvent.click(screen.getByTestId('vibe-energetic'));
  const advanceToProfile = () => {
    fireEvent.click(screen.getByTestId('lang-btn'));
    goNew();
    chooseVibe();
  };

  it('fires onboarding_started once on mount', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(trackOnboardingStart).toHaveBeenCalledTimes(1);
  });

  it('fires step=language on language select', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lang-btn'));
    goNew();
    expect(trackOnboardingStep).toHaveBeenCalledWith('language');
  });

  it('fires step=profile with hasPendingInvite=false', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToProfile();
    fireEvent.click(screen.getByTestId('profile-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('profile', {
      hasPendingInvite: false,
      nameEdited: false,
    });
  });

  it('fires step=style on style step completion', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToProfile();
    fireEvent.click(screen.getByTestId('profile-btn'));
    fireEvent.click(screen.getByTestId('style-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('style');
  });

  it('fires step=style exactly once (on completion, not on entry)', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToProfile();
    fireEvent.click(screen.getByTestId('profile-btn'));
    fireEvent.click(screen.getByTestId('style-btn'));

    const styleCalls = (trackOnboardingStep as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter((c) => c[0] === 'style');
    expect(styleCalls).toHaveLength(1);
  });

  it('never emits a tutorial step (tutorial removed from the short flow)', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    advanceToProfile();
    fireEvent.click(screen.getByTestId('profile-btn'));
    fireEvent.click(screen.getByTestId('style-btn'));
    expect(trackOnboardingStep).not.toHaveBeenCalledWith('tutorial');
    expect(trackOnboardingStep).not.toHaveBeenCalledWith('tutorial', expect.anything());
  });
});
