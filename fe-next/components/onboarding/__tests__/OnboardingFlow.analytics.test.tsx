/**
 * OnboardingFlow analytics — FTUE funnel events fire at each step transition.
 * Keeps tight to the 5-step state machine: language -> tutorial -> profile ->
 * scoreReveal -> fork. `score_reveal` carries `action` discriminator so the
 * funnel can split retry friction vs clean continues.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingStart: vi.fn(),
  trackOnboardingStep: vi.fn(),
  markFirstGameActivation: vi.fn(),
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

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  markGuidanceShown: vi.fn(),
}));

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

vi.mock('../TutorialGame', () => ({
  __esModule: true,
  default: ({ onComplete }: any) => (
    <button data-testid="tut-btn" onClick={() => onComplete(47, ['CAT', 'DOG', 'STAR'])}>
      tut
    </button>
  ),
}));

vi.mock('../QuickProfileSetup', () => ({
  __esModule: true,
  default: ({ onComplete, hasPendingInvite }: any) => (
    <button
      data-testid="profile-btn"
      data-pending={String(!!hasPendingInvite)}
      onClick={() => onComplete('Player1', {})}
    >
      profile
    </button>
  ),
}));

vi.mock('../ScoreRevealV2', () => ({
  __esModule: true,
  default: ({ onContinue }: any) => (
    <>
      <button data-testid="continue-btn" onClick={onContinue}>continue</button>
    </>
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
  // New player now picks a vibe (calm/energetic) before the tutorial.
  const chooseVibe = () => fireEvent.click(screen.getByTestId('vibe-energetic'));

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

  it('fires step=tutorial with score/wordCount on tutorial complete', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lang-btn'));
    goNew();
    chooseVibe();
    fireEvent.click(screen.getByTestId('tut-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('tutorial', {
      score: 47,
      wordCount: 3,
    });
  });

  it('fires step=profile with hasPendingInvite=false', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lang-btn'));
    goNew();
    chooseVibe();
    fireEvent.click(screen.getByTestId('tut-btn'));
    fireEvent.click(screen.getByTestId('profile-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('profile', {
      hasPendingInvite: false,
    });
  });

  it('fires step=profile with hasPendingInvite=true when invite present', () => {
    mockHasPendingRoom.mockReturnValue(true);
    mockConsumePendingRoom.mockReturnValue('ABC123');
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lang-btn'));
    goNew();
    chooseVibe();
    fireEvent.click(screen.getByTestId('tut-btn'));
    fireEvent.click(screen.getByTestId('profile-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('profile', {
      hasPendingInvite: true,
    });
  });

  // Regression: PostHog funnel showed tutorial step fires ~2x start count
  // because handleNewUser emitted 'tutorial' on entry AND handleTutorialComplete
  // emitted 'tutorial' on exit. Step events must fire once per step, on completion only.
  it('fires step=tutorial exactly once (on completion, not on entry)', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lang-btn'));
    goNew();
    chooseVibe();
    fireEvent.click(screen.getByTestId('tut-btn'));

    const tutorialCalls = (trackOnboardingStep as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter((c) => c[0] === 'tutorial');
    expect(tutorialCalls).toHaveLength(1);
    expect(tutorialCalls[0]).toEqual(['tutorial', { score: 47, wordCount: 3 }]);
  });

  it('never emits bare tutorial step without score payload', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lang-btn'));
    goNew();
    chooseVibe();
    fireEvent.click(screen.getByTestId('tut-btn'));

    expect(trackOnboardingStep).not.toHaveBeenCalledWith('tutorial');
    expect(trackOnboardingStep).not.toHaveBeenCalledWith('tutorial', undefined);
  });
});
